import Phaser from 'phaser';

const TILE_SIZE = 64;
const COLORS_STROKE_TILE = 0xffffff;
const GRID_SIZE = 8;
const COLORS = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xbb00ee];

const DURATION = 400;

export default class Match3Scene extends Phaser.Scene {
    private grid: Phaser.GameObjects.Rectangle[][] = [];

    private draggedTile: {
        row: number;
        col: number;
        sprite: Phaser.GameObjects.Rectangle;
    } | null = null;

    private dragOffset: { x: number; y: number } = { x: 0, y: 0 };

    constructor() {
        super('Match3Scene');
    }

    create() {
        this.createGrid();
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            const col = Math.floor(pointer.x / TILE_SIZE);
            const row = Math.floor(pointer.y / TILE_SIZE);
            const tile = this.grid[row]?.[col];
            if (tile) {
                this.draggedTile = { row, col, sprite: tile };
                this.dragOffset = {
                    x: pointer.x - tile.x,
                    y: pointer.y - tile.y,
                };
                tile.setDepth(1); // на передній план
            }
        });
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (!this.draggedTile) return;

            const tile = this.draggedTile.sprite;
            tile.x = pointer.x - this.dragOffset.x;
            tile.y = pointer.y - this.dragOffset.y;

            const toCol = Math.floor(pointer.x / TILE_SIZE);
            const toRow = Math.floor(pointer.y / TILE_SIZE);

            const from = this.draggedTile;

            // Перевірка на сусіда
            if (
                (Math.abs(from.row - toRow) === 1 && from.col === toCol) ||
                (Math.abs(from.col - toCol) === 1 && from.row === toRow)
            ) {
                const toTile = this.grid[toRow]?.[toCol];
                if (!toTile) return;

                this.draggedTile.sprite.setDepth(0);
                this.draggedTile = null;

                this.swapTiles(from.row, from.col, toRow, toCol);

                this.time.delayedCall(150, () => {
                    if (!this.checkMatches()) {
                        this.swapTiles(from.row, from.col, toRow, toCol);
                    }
                });
            }
        });
        this.input.on('pointerup', () => {
            if (!this.draggedTile) return;

            const { row, col, sprite } = this.draggedTile;
            sprite.setDepth(0);
            this.tweens.add({
                targets: sprite,
                x: col * TILE_SIZE + TILE_SIZE / 2,
                y: row * TILE_SIZE + TILE_SIZE / 2,
                duration: 100,
                ease: 'Power2',
            });

            this.draggedTile = null;
        });
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
        let color = Phaser.Math.RND.pick(COLORS);
        const left2 = this.grid[row]?.[col - 2];
        const top2 = this.grid[row - 2]?.[col];

        while (left2?.fillColor == color || top2?.fillColor == color) {
            color = Phaser.Math.RND.pick(COLORS);
        }

        const tile = this.add
            .rectangle(
                col * TILE_SIZE + TILE_SIZE / 2,
                -TILE_SIZE,
                TILE_SIZE - 4,
                TILE_SIZE - 4,
                color,
            )
            .setStrokeStyle(2, COLORS_STROKE_TILE)
            .setInteractive();

        this.grid[row][col] = tile;

        this.tweens.add({
            targets: tile,
            y: row * TILE_SIZE + TILE_SIZE / 2,
            duration: DURATION,
            delay: col * 50 + row * 20, // для ефекту каскаду
            ease: 'Bounce.Out',
        });
    }

    swapTiles(r1: number, c1: number, r2: number, c2: number) {
        const tile1 = this.grid[r1][c1];
        const tile2 = this.grid[r2][c2];

        // Анімоване переміщення tile1
        this.tweens.add({
            targets: tile1,
            x: c2 * TILE_SIZE + TILE_SIZE / 2,
            y: r2 * TILE_SIZE + TILE_SIZE / 2,
            duration: 100,
            ease: 'Power2',
        });

        // Анімоване переміщення tile2
        this.tweens.add({
            targets: tile2,
            x: c1 * TILE_SIZE + TILE_SIZE / 2,
            y: r1 * TILE_SIZE + TILE_SIZE / 2,
            duration: 100,
            ease: 'Power2',
        });

        // Swap in grid
        this.grid[r1][c1] = tile2;
        this.grid[r2][c2] = tile1;
    }

    checkMatches(): boolean {
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

        // this.input.enabled = false;
        matchedSet.forEach(key => {
            const [row, col] = key.split(',').map(Number);
            this.grid[row][col].destroy();
            this.grid[row][col] = null!;
        });

        this.time.delayedCall(200, () => {
            this.dropTiles();
            // this.input.enabled = true;
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
                        duration: DURATION,
                        ease: 'Bounce.Out',
                    });
                }
            }

            // Створення нових плиток
            for (let i = 0; i < emptySpots; i++) {
                this.createTile(i, col);
            }
        }

        this.time.delayedCall(DURATION + 100, () => {
            this.checkMatches();
        });
    }
}
