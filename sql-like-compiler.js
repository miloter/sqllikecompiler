'use strict';
import Scanner from "@miloter/scanner";
import SimilWords from "@miloter/simil-words";
/**
 * Implementación de un compilador de texto a un formato apto
 * para hacer consultas SQL con el operador 'like'.
 * Dependencias:
 *  scanner.js (clase Scanner)
 *  simil-words.js (objeto similWords) 
 * 
 * Ejemplo:
 *      const sqlCompTitle = new SqlLikeCompiler('title');
 *      sqlCompTitle.eval('a b c'):
 *          'title like '%a%' or title like '%b%' or title like '%c%'.
 *      sqlCompTitle.eval('a and not (b or c)'):
 *          'title like '%a%' and not (title like '%b%' or title like '%c%')'.
 *
 * @author miloter
 * @since 1.0.0     2024-12-15
 * @version 1.0.0   2024-12-15
 * @license MIT
 */
export default class SqlLikeCompiler {    
    static #T_NOT = 1;
    static #T_AND = 2;
    static #T_OR = 3;
    static #T_PAR_O = 4;
    static #T_PAR_C = 5;

    #sw; // Clase para realizar conversiones a palabras padre
    #scan; // Instancia del analizador léxico
    #token; // El token en curso
    #result; // El resultado parcial como una cadena
    #fieldSearch; // Nombre del campo utilizado para construir la sentencia LIKE

    /**
     * 
     * @param {string} [field = 'field'] Nombre del campo que se usará para
     * construir la sentencia LIKE.
     */
    constructor(field = 'field') {
        if (field.trim()) {
            this.#fieldSearch = field;    
        }
        this.#sw = new SimilWords(); // Clase para realizar conversiones a palabras padre
        this.#scan = new Scanner('', true);
        this.#scan.setOperatorString('"');
        this.#scan.setOperatorCommentMultilineBegin('');
        this.#scan.setOperatorCommentMultilineEnd('');
        this.#scan.setOperatorCommentEol('');    
        this.#scan.setOperatorChar('');    
        this.#scan.setIgnoreComments(true);    
        this.#scan.setIgnoreSpacesInLine(true);
        this.#scan.setIgnoreEndOfLines(true);
        this.#scan.addKeyword(SqlLikeCompiler.#T_NOT, "not");
        this.#scan.addKeyword(SqlLikeCompiler.#T_AND, "and");
        this.#scan.addKeyword(SqlLikeCompiler.#T_OR, "or");
        this.#scan.addOperator(SqlLikeCompiler.#T_PAR_O, "(");
        this.#scan.addOperator(SqlLikeCompiler.#T_PAR_C, ")");    
    }
    
    /**
     * Establece el nombre del campo LIKE.
     */
    set fieldSearch(value) {
        if (value.trim()) {
            this.#fieldSearch = value;
        }        
    }

    /**
     * Devuelve el nombre del campo LIKE.
     */
    get fieldSearch() {
        return this.#fieldSearch;
    }

    /**
     * Evalua una expresión y devuelve la expresión compilada lista para
     * ser usada como argumento de una sentencia LIKE.
     * @param {string} expr 
     * @returns {string}
     */
    eval(expr) {
        this.#scan.setText(this.#sw.parentString(expr));
        this.#token = this.#scan.nextToken();
        this.#result = '(';
        this.#expresion();
        if (this.#token !== Scanner.eof) {
            throw new Error('Inesperado "' + this.#scan.getLexeme() + '", en línea ' +
                this.#scan.tokenLin() + ', columna ' + this.#scan.tokenCol());
        }

        return this.#result + ')';
    }

    #expresion() {
        this.#opOr();            
    }

    #opOr() {
        this.#opAnd();
        this.#restoOpOr();
    }

    #restoOpOr() {
        while (this.#token === SqlLikeCompiler.#T_OR || (this.#token !== SqlLikeCompiler.#T_PAR_C && this.#token !== Scanner.eof)) {
            if (this.#token === SqlLikeCompiler.#T_OR) {
                this.#token = this.#scan.nextToken();
            }

            this.#result += ' or ';
            this.#opAnd();
        }
    }

    #opAnd() {
        this.#opUn();
        this.#restoOpAnd();
    }

    #restoOpAnd() {
        while (this.#token === SqlLikeCompiler.#T_AND) {
            this.#result += ' and ';
            this.#token = this.#scan.nextToken();
            this.#opUn();
        }
    }

    #opUn() {	        		
		if (this.#token === SqlLikeCompiler.#T_NOT) {			
			this.#result += ' not ';
            this.#token = this.#scan.nextToken();		
        }				
		
		this.#opPrim();		
    }

    #opPrim() {
        if (this.#token === SqlLikeCompiler.#T_PAR_O) {
            this.#result += '(';
            this.#token = this.#scan.nextToken();
            this.#expresion();
            if (this.#token === SqlLikeCompiler.#T_PAR_C) {
                this.#result += ')';
                this.#token = this.#scan.nextToken();
            } else {                
                throw new Error('Se esperaba ")", en línea ' +
                    this.#scan.tokenLin() + ', columna ' + this.#scan.tokenCol());
            }
        } else if (this.#token === Scanner.string) {
            this.#result += this.#fieldSearch + " like '%" + this.#scan.getProcessedString().replace(/'/g, "''") + "%'";
            this.#token = this.#scan.nextToken();
        } else if (this.#token !== Scanner.eof && this.#scan.getTokenClass() !== Scanner.keyword) {			
            this.#scan.setIgnoreSpacesInLine(false);
            this.#scan.setIgnoreEndOfLines(false);
            let s = '';
            do {
                s += this.#scan.getLexeme();
                this.#token = this.#scan.nextToken();
            } while (this.#token === Scanner.ident || this.#token === Scanner.number || this.#token === Scanner.uknown);
            this.#scan.setIgnoreSpacesInLine(true);
            this.#scan.setIgnoreEndOfLines(true);
            if (this.#token === Scanner.space || this.#token === Scanner.eol) {
                this.#token = this.#scan.nextToken();
            }
            this.#result += this.#fieldSearch + " like '%" + s.replace(/'/g, "''") + "%'";
        } else if (this.#token === Scanner.eof && this.#result === '(') {
            this.#result += this.#fieldSearch + " like '%'";
        } else {
            throw new Error('Se esperaba una expresión de búsqueda, en línea ' +
                    this.#scan.tokenLin() + ', columna ' + this.#scan.tokenCol());
        }
    }
}
