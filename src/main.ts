import './style.css'

// 游戏配置
interface Difficulty {
  rows: number
  cols: number
  mines: number
}

const difficulties: Record<string, Difficulty> = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 30, mines: 99 }
}

// 格子状态
interface Cell {
  isMine: boolean
  isRevealed: boolean
  isFlagged: boolean
  neighborMines: number
}

// 游戏状态
class Game {
  private rows: number
  private cols: number
  private mines: number
  private board: Cell[][]
  private gameOver: boolean
  private firstClick: boolean
  private flagsPlaced: number
  private timer: number
  private timerInterval: number | null

  constructor(difficulty: Difficulty) {
    this.rows = difficulty.rows
    this.cols = difficulty.cols
    this.mines = difficulty.mines
    this.board = []
    this.gameOver = false
    this.firstClick = true
    this.flagsPlaced = 0
    this.timer = 0
    this.timerInterval = null
  }

  // 初始化棋盘
  init(): void {
    this.board = []
    for (let i = 0; i < this.rows; i++) {
      const row: Cell[] = []
      for (let j = 0; j < this.cols; j++) {
        row.push({
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          neighborMines: 0
        })
      }
      this.board.push(row)
    }
  }

  // 布雷（第一次点击后）
  placeMines(excludeRow: number, excludeCol: number): void {
    let placed = 0
    while (placed < this.mines) {
      const row = Math.floor(Math.random() * this.rows)
      const col = Math.floor(Math.random() * this.cols)
      
      // 不在第一次点击的位置及其周围布雷
      if (Math.abs(row - excludeRow) <= 1 && Math.abs(col - excludeCol) <= 1) {
        continue
      }
      
      if (!this.board[row][col].isMine) {
        this.board[row][col].isMine = true
        placed++
      }
    }
    
    // 计算每个格子的邻居雷数
    this.calculateNeighborMines()
  }

  // 计算邻居雷数
  private calculateNeighborMines(): void {
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (this.board[i][j].isMine) continue
        
        let count = 0
        for (let di = -1; di <= 1; di++) {
          for (let dj = -1; dj <= 1; dj++) {
            const ni = i + di
            const nj = j + dj
            if (ni >= 0 && ni < this.rows && nj >= 0 && nj < this.cols) {
              if (this.board[ni][nj].isMine) count++
            }
          }
        }
        this.board[i][j].neighborMines = count
      }
    }
  }

  // 翻开格子
  reveal(row: number, col: number): boolean {
    if (this.gameOver || this.board[row][col].isRevealed || this.board[row][col].isFlagged) {
      return false
    }

    // 第一次点击时布雷
    if (this.firstClick) {
      this.firstClick = false
      this.placeMines(row, col)
      this.startTimer()
    }

    const cell = this.board[row][col]
    cell.isRevealed = true

    // 点到雷了
    if (cell.isMine) {
      this.gameOver = true
      this.stopTimer()
      this.revealAllMines()
      return false
    }

    // 如果是空白格（周围没有雷），递归翻开
    if (cell.neighborMines === 0) {
      this.floodFill(row, col)
    }

    // 检查是否胜利
    this.checkWin()
    return true
  }

  // 扫描：点击已翻开的数字，如果周围旗子数等于数字，翻开周围未插旗的格子
  sweep(row: number, col: number): boolean {
    const cell = this.board[row][col]
    if (!cell.isRevealed || cell.neighborMines === 0) {
      return false
    }

    // 数周围有多少旗子
    let flagCount = 0
    const neighbors: [number, number][] = []
    
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        if (di === 0 && dj === 0) continue
        const ni = row + di
        const nj = col + dj
        if (ni >= 0 && ni < this.rows && nj >= 0 && nj < this.cols) {
          const neighbor = this.board[ni][nj]
          if (neighbor.isFlagged) {
            flagCount++
          } else if (!neighbor.isRevealed) {
            neighbors.push([ni, nj])
          }
        }
      }
    }

    // 如果旗子数等于数字，翻开周围所有未插旗的格子
    if (flagCount === cell.neighborMines) {
      let hitMine = false
      for (const [ni, nj] of neighbors) {
        if (this.reveal(ni, nj) === false && this.board[ni][nj].isMine) {
          hitMine = true
        }
      }
      return !hitMine
    }

    return false
  }

  // 插旗/取消插旗
  toggleFlag(row: number, col: number): void {
    if (this.gameOver || this.board[row][col].isRevealed) return

    const cell = this.board[row][col]
    cell.isFlagged = !cell.isFlagged
    this.flagsPlaced += cell.isFlagged ? 1 : -1
    this.updateMineCount()
  }

  // 扩散翻开空白区域
  private floodFill(row: number, col: number): void {
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        const ni = row + di
        const nj = col + dj
        if (ni >= 0 && ni < this.rows && nj >= 0 && nj < this.cols) {
          const cell = this.board[ni][nj]
          if (!cell.isRevealed && !cell.isFlagged) {
            cell.isRevealed = true
            if (cell.neighborMines === 0) {
              this.floodFill(ni, nj)
            }
          }
        }
      }
    }
  }

  // 显示所有雷
  private revealAllMines(): void {
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        this.board[i][j].isRevealed = true
      }
    }
  }

  // 检查胜利
  private checkWin(): void {
    let revealedCount = 0
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (this.board[i][j].isRevealed) {
          revealedCount++
        }
      }
    }

    const totalCells = this.rows * this.cols
    if (revealedCount === totalCells - this.mines) {
      this.gameOver = true
      this.stopTimer()
      this.flagAllMines()
    }
  }

  // 胜利时标记所有雷
  private flagAllMines(): void {
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (this.board[i][j].isMine) {
          this.board[i][j].isFlagged = true
        }
      }
    }
    this.flagsPlaced = this.mines
    this.updateMineCount()
  }

  // 计时器
  private startTimer(): void {
    this.timerInterval = window.setInterval(() => {
      this.timer++
      this.updateTimer()
    }, 1000)
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
  }

  // 获取格子
  getCell(row: number, col: number): Cell {
    return this.board[row][col]
  }

  isGameOver(): boolean {
    return this.gameOver
  }

  getRows(): number { return this.rows }
  getCols(): number { return this.cols }
  getMines(): number { return this.mines }
  getFlagsPlaced(): number { return this.flagsPlaced }
  getTimer(): number { return this.timer }

  private updateMineCount(): void {
    const el = document.getElementById('mine-count')
    if (el) {
      el.textContent = (this.mines - this.flagsPlaced).toString()
    }
  }

  private updateTimer(): void {
    const el = document.getElementById('timer')
    if (el) {
      el.textContent = this.timer.toString()
    }
  }
}

// 渲染器
class Renderer {
  private game: Game
  private boardEl: HTMLElement

  constructor(game: Game) {
    this.game = game
    this.boardEl = document.getElementById('game-board')!
  }

  render(): void {
    this.boardEl.innerHTML = ''
    this.boardEl.style.gridTemplateColumns = `repeat(${this.game.getCols()}, 30px)`
    
    for (let i = 0; i < this.game.getRows(); i++) {
      for (let j = 0; j < this.game.getCols(); j++) {
        const cell = this.game.getCell(i, j)
        const cellEl = document.createElement('div')
        cellEl.className = 'cell'
        cellEl.dataset.row = i.toString()
        cellEl.dataset.col = j.toString()
        
        if (cell.isRevealed) {
          cellEl.classList.add('revealed')
          if (cell.isMine) {
            cellEl.classList.add('mine')
            cellEl.textContent = '💣'
          } else if (cell.neighborMines > 0) {
            cellEl.textContent = cell.neighborMines.toString()
            cellEl.classList.add(`num-${cell.neighborMines}`)
            // 数字格子可以触发扫描
            cellEl.classList.add('sweepable')
          }
        } else if (cell.isFlagged) {
          cellEl.classList.add('flagged')
          cellEl.textContent = '🚩'
        }

        cellEl.addEventListener('click', () => this.handleClick(i, j))
        cellEl.addEventListener('contextmenu', (e) => {
          e.preventDefault()
          this.handleRightClick(i, j)
        })

        this.boardEl.appendChild(cellEl)
      }
    }
  }

  private handleClick(row: number, col: number): void {
    const cell = this.game.getCell(row, col)
    
    // 如果已经翻开且有数字，触发扫描
    if (cell.isRevealed && cell.neighborMines > 0) {
      this.game.sweep(row, col)
    } else {
      this.game.reveal(row, col)
    }
    
    this.render()
    this.checkGameEnd()
  }

  private handleRightClick(row: number, col: number): void {
    this.game.toggleFlag(row, col)
    this.render()
  }

  private checkGameEnd(): void {
    const messageEl = document.getElementById('game-message')
    if (this.game.isGameOver()) {
      const revealed = Array.from(this.boardEl.children).filter(
        el => el.classList.contains('revealed') && !el.classList.contains('mine')
      ).length
      const totalSafe = this.game.getRows() * this.game.getCols() - this.game.getMines()
      
      if (revealed === totalSafe) {
        messageEl.textContent = '🎉 恭喜获胜！'
        messageEl.className = 'game-message win'
      } else {
        messageEl.textContent = '💥 游戏结束！'
        messageEl.className = 'game-message lose'
      }
    } else {
      messageEl.textContent = ''
      messageEl.className = 'game-message'
    }
  }
}

// 主程序
let game: Game
let renderer: Renderer

function newGame(): void {
  const difficulty = (document.getElementById('difficulty') as HTMLSelectElement).value
  game = new Game(difficulties[difficulty])
  game.init()
  renderer = new Renderer(game)
  renderer.render()
  
  // 重置显示
  document.getElementById('mine-count')!.textContent = game.getMines().toString()
  document.getElementById('timer')!.textContent = '0'
  document.getElementById('game-message')!.textContent = ''
  document.getElementById('game-message')!.className = 'game-message'
}

document.getElementById('new-game')!.addEventListener('click', newGame)
document.getElementById('difficulty')!.addEventListener('change', newGame)

// 启动游戏
newGame()
