


function bitcount(n: number): number {
  let cur = n;
  let count = 0;
  while (cur != 0) {
    cur &= (cur-1);
    count++;
  }
  return count;
}

function leastBitLog2(bits: number): number {
  for (let i = 1; i <= 9; i++)
    if ((bits & (1<<i)) != 0)
      return i;
  return -1;
}

function nextBitLog2(bits: number, last: number): number {
  for (let i = last+1; i <= 9; i++)
    if ((bits & (1<<i)) != 0)
      return i;
  return -1;
}

function log2(n:number): number {
  return Math.floor(Math.log2(n));
}

interface SudokuBacktrackState {
  state: SudokuSolver;
  cellIndex: number;
  currentGuess: number;
}

function replaceAt(str:string, index:number, chr:string): string {
    if(index > str.length-1) return str;
    return str.substring(0,index) + chr + str.substring(index+1);
}

function possBits(n:number): string {
  let s = '[';
  for (let i = 1; i <= 9; i++)
    if ((n & (1<<i)) != 0)
      s += `${i}`;
  return s+']';
}

class SudokuSolver {
  backtrack: SudokuBacktrackState | null;
  possibilities: Uint16Array;
  board: string;
  constructor(possibilities: Uint16Array | null, board: string | null) {
    this.backtrack = null;
    if (possibilities) {
      this.possibilities = new Uint16Array(possibilities);
    } else {
      this.possibilities = new Uint16Array(81);
      for (let i = 0; i < 81; i++)
        this.possibilities[i] = 1022;
    }
    if (board) {
      this.board = board;
    } else {
      this.board = ''.padEnd(81);
    }
  }

  // returns whether the digit leads to a contraction.
  setDigit(index: number, value: number): boolean {
    // test all cells in the row
    const row = Math.floor(index/9);
    const col = index%9;
    //console.log(`setDigit start: index=${index} row=${row} col=${col} value=${value}`);
    const subrow = Math.floor(row/3);
    const subcol = Math.floor(col/3);
    const poss = this.possibilities;
    const bit = 1 << value;
    for (let r = 0; r < 9; r++) {
      if (r != row && (poss[col + r*9] & ~bit) == 0) {
        console.log(`[col] failed at ${col},${r} bit=${bit} ${possBits(poss[col+r*9])}`);
        return false;
      }
    }
    for (let c = 0; c < 9; c++) {
      if (c != col && (poss[c + row*9] & ~bit) == 0) {
        console.log(`[row] failed at ${c},${row} bit=${bit} ${possBits(poss[c+row*9])}`);
        return false;
      }
    }
    let ul = subrow * 3 * 9 + subcol * 3;
    for (let c = 0; c < 3; c++) {
      for (let r = 0; r < 3; r++) {
        let i = ul + c + r * 9;
        if (i != index && (poss[i] & ~bit) == 0) {
          console.log(`[subblock ${subcol},${subrow}] ${subcol*3+c},${subrow*3+r} ${possBits(poss[i])}`);
          return false;
        }
      }
    }

    // Now, perform the updates.
    for (let r = 0; r < 9; r++) {
      poss[col + r*9] &= ~bit;
    }
    for (let c = 0; c < 9; c++) {
      poss[c + row*9] &= ~bit;
    }
    for (let c = 0; c < 3; c++) {
      for (let r = 0; r < 3; r++)
        poss[ul + c + r*9] &= ~bit;
    }
    poss[index] = bit;
    this.board = replaceAt(this.board, index, value.toString());
    //this.printBoard();
    return true;
  }

  printBoard() {
    for (let i = 0; i < 9; i++) {
      console.log(this.board.substring(9*i,9));
    }
  }
  printPossibilities() {
    const poss = this.possibilities;
    for (let i = 0; i < 9; i++) {
      for (let si = 0; si < 3; si++) {
        let rv = '';
        for (let j = 0; j < 9; j++) {
          for (let sj = 0; sj < 3; sj++) {
            const p = poss[i*9+j];
            const b = si*3 + sj + 1;
            if (this.board[i*9+j] !== ' ') {
              if (si == 1 && sj == 1) {
                rv += this.board[i*9+j];
              } else {
                rv += '~';
              }
            } else if ((p & (1<<b)) != 0)
              rv += b.toString();
            else
              rv += ' ';
          }
          rv += (j % 3 == 2) ? '|' : ' ';
        }
        console.log(rv);
      }
      console.log((i % 3 == 2) ? '-----------+'.repeat(3) : '   .'.repeat(9));
    }
  }

  doProcessOfElimination() {
    let did_set: boolean;
    //console.log(`beginning process of elimination`);
    do {
      did_set = false;
      for (let i = 0; i < 81; i++) {
        const bc = bitcount(this.possibilities[i]);
        if (bc == 1 && this.board[i] === ' ') {
          if (!this.setDigit(i, log2(this.possibilities[i]))) {
            return false;
          }
          did_set = true;
        }
      }
    } while(did_set);
    //console.log(`done process of elimination: board=`);
    //this.printBoard();
    return true;
  }
}

function solve(values: string): string {
  if (values.length != 81) {
    throw new Error('bad board size');
  }
  let solver = new SudokuSolver();
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (values[r*9+c] !== ' ') {
        const v = parseInt(values[r*9+c]);
        //console.log(`set digit: ${values[r*9+c]} c=${c} r=${r} v=${v} isnon=${Number.isNaN(v)}`);
        if (Number.isNaN(v) || v === 0) {
          throw new Error(`bad character in board at (${c+1},${r+1})`);
        }
        if (!solver.setDigit(r*9+c, v)) {
          throw new Error(`contradiction in initial board at (${c+1},${r+1})`);
        }
      }
    }
  }


  main_solving_loop: for (;;) {
    // Handle pure-process of elimination.
    if (!solver.doProcessOfElimination()) {
      while (solver.backtrack) {
        const {cellIndex, currentGuess} = solver.backtrack;
        const choices = solver.backtrack.state.possibilities[cellIndex];
        const next = nextBitLog2(choices, currentGuess);
        if (next < 0) {
          console.log(`ending guess at ${currentGuess}`);
          solver = solver.backtrack.state;
        } else {
          console.log(`next guess at ${currentGuess} is ${next}`);
          solver.backtrack.currentGuess = next;
          solver.possibilities = new Uint16Array(solver.backtrack.state.possibilities);
          solver.board = solver.backtrack.state.board;
          if (!solver.setDigit(cellIndex, next)) {
            throw new Error('should not happen');
          }
          continue main_solving_loop;
        }
      }
      if (!solver.backtrack) {
        return null;
      }
    }

    // Find the index with the least number of possibilities,
    // and start guessing about that.
    let min_bit_count = 10;
    let best_index = -1;
    for (let i = 0; i < 81; i++) {
      const bc = bitcount(solver.possibilities[i]);
      if (bc > 1 && bc < min_bit_count) {
        min_bit_count = bc;
        best_index = i;
      }
    }

    if (best_index < 0) {
      // boast is solved!
      return solver.board;
    }

    const new_solver = new SudokuSolver(solver.possibilities, solver.board);
    const first_guess = leastBitLog2(solver.possibilities[best_index]);
    new_solver.backtrack = {
      state: solver,
      cellIndex: best_index,
      currentGuess: first_guess
    };
    console.log(`pushing guess: ${first_guess} at ${best_index}`);
    if (!new_solver.setDigit(best_index, first_guess))
      throw new Error('should not happen');
    solver = new_solver;
  }
}

const answer = solve( '53  7    ' +
                      '6  195   ' +
                      ' 98    6 ' +
                      '8   6   3' +
                      '4  8 3  1' +
                      '7   2   6' +
                      ' 6    28 ' +
                      '   419  5' +
                      '    8  79');
 
function formatBoardString(s: string): string[] {
  const rv: string[] = [];
  for (let i = 0; i < 9; i++) {
    let cur = '';
    for (let j = 0; j < 9; j++) {
      cur += s[i*9+j];
      if (j == 2 || j == 5)
        cur += '|';
    }
    rv.push(cur);
    if (i == 2 || i == 5)
      rv.push('---+---+---');
  }
  return rv;
}
function printBoardString(s: string) {
  for (const line of formatBoardString(s))
    console.log(line);
}
printBoardString(answer);
