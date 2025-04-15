import Phaser from 'phaser';

const TILE_SIZE = 64;
const GRID_SIZE = 8;
const COLORS = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xbb00ee];

export default class Match3Scene extends Phaser.Scene {
    private grid: Phaser.GameObjects.Rectangle[][] = [];
    private selectedTile: { row: number; col: number } | null = null;

    constructor() {
        super('Match3Scene');
    }

    create() {
        this.createGrid();
        this.input.on('pointerdown', this.handlePointerDown, this);
    }

    createGrid() {
        for (let row = 0; row < GRID_SIZE; row++) {
            this.grid[row] = [];
            for (let col = 0; col < GRID_SIZE; col++) {
                this.createTile(row, col);
            }
        }
    }

    createTile(row: number, col: number) {
        const color = Phaser.Math.RND.pick(COLORS);
        const tile = this.add
            .rectangle(
                col * TILE_SIZE + TILE_SIZE / 2,
                row * TILE_SIZE + TILE_SIZE / 2,
                TILE_SIZE - 4,
                TILE_SIZE - 4,
                color,
            )
            .setStrokeStyle(2, 0xffffff)
            .setInteractive();

        this.grid[row][col] = tile;
        return tile;
    }

    handlePointerDown(pointer: Phaser.Input.Pointer) {
        const col = Math.floor(pointer.x / TILE_SIZE);
        const row = Math.floor(pointer.y / TILE_SIZE);

        if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;

        if (!this.selectedTile) {
            this.selectedTile = { row, col };
            this.highlightTile(row, col);
        } else {
            const { row: prevRow, col: prevCol } = this.selectedTile;
            if (this.areAdjacent(row, col, prevRow, prevCol)) {
                this.swapTiles(row, col, prevRow, prevCol);
                this.time.delayedCall(100, () => {
                    if (!this.checkMatches()) {
                        this.swapTiles(row, col, prevRow, prevCol); // swap back if no match
                    }
                });
            }
            this.clearHighlights();
            this.selectedTile = null;
        }
    }

    // handlePointerDown(pointer: Phaser.Input.Pointer) {
    //     const col = Math.floor(pointer.x / TILE_SIZE);
    //     const row = Math.floor(pointer.y / TILE_SIZE);

    //     if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;

    //     // Збереження вибраної плитки
    //     this.selectedTile = { row, col };

    //     // Додаємо плитці можливість слідувати за мишкою
    //     const tile = this.grid[row][col];
    //     tile.setData('isDragging', true);
    //     tile.setData('offsetX', pointer.x - tile.x);
    //     tile.setData('offsetY', pointer.y - tile.y);

    //     // Встановлюємо обробник для переміщення плитки
    //     this.input.on('pointermove', this.handlePointerMove, this);

    //     // Встановлюємо обробник для відпускання плитки
    //     this.input.once('pointerup', this.handlePointerUp, this);
    // }

    // handlePointerMove(pointer: Phaser.Input.Pointer) {
    //     if (this.selectedTile) {
    //         const tile =
    //             this.grid[this.selectedTile.row][this.selectedTile.col];
    //         // Оновлюємо позицію плитки згідно з координатами миші
    //         tile.x = pointer.x - tile.getData('offsetX');
    //         tile.y = pointer.y - tile.getData('offsetY');
    //     }
    // }

    // handlePointerUp(pointer: Phaser.Input.Pointer) {
    //     if (this.selectedTile) {
    //         const { row, col } = this.selectedTile;

    //         const colTarget = Math.floor(pointer.x / TILE_SIZE);
    //         const rowTarget = Math.floor(pointer.y / TILE_SIZE);

    //         // Перевірка, чи плитка переміщена в іншу клітинку
    //         if (row !== rowTarget || col !== colTarget) {
    //             this.moveTileTo(row, col, rowTarget, colTarget);
    //         }

    //         // Відновлення плитки до початкового положення
    //         const tile = this.grid[row][col];
    //         tile.setData('isDragging', false);

    //         // Очищаємо вибір
    //         this.selectedTile = null;
    //     }

    //     // Прибираємо обробник переміщення
    //     this.input.off('pointermove', this.handlePointerMove, this);
    // }

    // moveTileTo(fromRow: number, fromCol: number, toRow: number, toCol: number) {
    //     // Переміщення плитки в нову позицію
    //     const tile = this.grid[fromRow][fromCol];
    //     this.grid[toRow][toCol] = tile;
    //     this.grid[fromRow][fromCol] = null!;

    //     // Оновлюємо координати плитки
    //     tile.setPosition(
    //         toCol * TILE_SIZE + TILE_SIZE / 2,
    //         toRow * TILE_SIZE + TILE_SIZE / 2,
    //     );

    //     // Перевіряємо на наявність комбінацій після переміщення
    //     this.checkMatches();
    // }

    highlightTile(row: number, col: number) {
        this.grid[row][col].setStrokeStyle(4, 0xffffff);
    }

    clearHighlights() {
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                this.grid[row][col].setStrokeStyle(2, 0xffffff);
            }
        }
    }

    areAdjacent(r1: number, c1: number, r2: number, c2: number): boolean {
        return (
            (Math.abs(r1 - r2) === 1 && c1 === c2) ||
            (Math.abs(c1 - c2) === 1 && r1 === r2)
        );
    }

    swapTiles(r1: number, c1: number, r2: number, c2: number) {
        const tile1 = this.grid[r1][c1];
        const tile2 = this.grid[r2][c2];

        // Swap positions
        const tempX = tile1.x;
        const tempY = tile1.y;
        tile1.x = tile2.x;
        tile1.y = tile2.y;
        tile2.x = tempX;
        tile2.y = tempY;

        // Swap in grid
        this.grid[r1][c1] = tile2;
        this.grid[r2][c2] = tile1;
    }

    checkMatches(): boolean {
        const matched: { row: number; col: number }[] = [];
        const matchedSet = new Set<string>();

        // Horizontal
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE - 2; col++) {
                const a = this.grid[row][col].fillColor;
                const b = this.grid[row][col + 1].fillColor;
                const c = this.grid[row][col + 2].fillColor;
                if (a === b && b === c) {
                    matchedSet.add(`${row},${col}`);
                    matchedSet.add(`${row},${col + 1}`);
                    matchedSet.add(`${row},${col + 2}`);
                }
            }
        }

        // Vertical
        for (let col = 0; col < GRID_SIZE; col++) {
            for (let row = 0; row < GRID_SIZE - 2; row++) {
                const a = this.grid[row][col].fillColor;
                const b = this.grid[row + 1][col].fillColor;
                const c = this.grid[row + 2][col].fillColor;
                if (a === b && b === c) {
                    matchedSet.add(`${row},${col}`);
                    matchedSet.add(`${row + 1},${col}`);
                    matchedSet.add(`${row + 2},${col}`);
                }
            }
        }

        if (matchedSet.size === 0) return false;

        matchedSet.forEach(key => {
            const [row, col] = key.split(',').map(Number);
            this.grid[row][col].destroy();
            this.grid[row][col] = null!;
        });

        this.time.delayedCall(200, () => {
            this.dropTiles();
        });

        return true;
    }

    dropTiles() {
        for (let col = 0; col < GRID_SIZE; col++) {
            let emptySpots = 0;
            for (let row = GRID_SIZE - 1; row >= 0; row--) {
                const tile = this.grid[row][col];
                if (!tile) {
                    emptySpots++;
                } else if (emptySpots > 0) {
                    this.grid[row + emptySpots][col] = tile;
                    this.grid[row][col] = null!;

                    this.tweens.add({
                        targets: tile,
                        y: tile.y + TILE_SIZE * emptySpots,
                        duration: 200,
                        ease: 'Bounce.Out',
                    });
                }
            }

            // Створення нових плиток
            for (let i = 0; i < emptySpots; i++) {
                const newTile = this.createTile(i, col);
                newTile.y -= TILE_SIZE * emptySpots; // спавн вище, щоб анімовано впала вниз

                this.tweens.add({
                    targets: newTile,
                    y: i * TILE_SIZE + TILE_SIZE / 2,
                    duration: 200,
                    ease: 'Bounce.Out',
                });
            }
        }

        this.time.delayedCall(250, () => {
            this.checkMatches();
        });
    }
}
