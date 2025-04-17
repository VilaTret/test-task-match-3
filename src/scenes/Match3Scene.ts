import Phaser from 'phaser';
import { GRID, TILE } from '../utils/constants';

export default class Match3Scene extends Phaser.Scene {
    private grid: Phaser.GameObjects.Rectangle[][] = [];

    private draggedTile: {
        row: number;
        col: number;
        sprite: Phaser.GameObjects.Rectangle;
    } | null = null;

    private dragOffset: { x: number; y: number } = { x: 0, y: 0 };

    private tilesToDrop: number = 0;

    constructor() {
        super('Match3Scene');
    }

    create() {
        this.createGrid();
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            const col = Math.floor(pointer.x / TILE.SIZE);
            const row = Math.floor(pointer.y / TILE.SIZE);
            const tile = this.grid[row]?.[col];
            if (tile) {
                this.draggedTile = { row, col, sprite: tile };
                this.dragOffset = {
                    x: pointer.x - tile.x,
                    y: pointer.y - tile.y,
                };
                tile.setDepth(1);
            }
        });
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (!this.draggedTile) return;

            const tile = this.draggedTile.sprite;
            tile.x = pointer.x - this.dragOffset.x;
            tile.y = pointer.y - this.dragOffset.y;

            const toCol = Math.floor(pointer.x / TILE.SIZE);
            const toRow = Math.floor(pointer.y / TILE.SIZE);

            const from = this.draggedTile;

            if (
                (Math.abs(from.row - toRow) === 1 && from.col === toCol) ||
                (Math.abs(from.col - toCol) === 1 && from.row === toRow)
            ) {
                const toTile = this.grid[toRow]?.[toCol];
                if (!toTile) return;

                this.draggedTile.sprite.setDepth(0);
                this.draggedTile = null;

                this.swapTiles(from.row, from.col, toRow, toCol);

                this.time.delayedCall(TILE.SWAP_DURATION + 50, () => {
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
                x: col * TILE.SIZE + TILE.SIZE / 2,
                y: row * TILE.SIZE + TILE.SIZE / 2,
                duration: TILE.SWAP_DURATION,
                ease: 'Power2',
            });

            this.draggedTile = null;
        });
    }

    createGrid() {
        for (let row = 0; row < GRID.SIZE; row++) {
            this.grid[row] = [];
            for (let col = 0; col < GRID.SIZE; col++) {
                this.createTile(row, col);
            }
        }
    }

    createTile(row: number, col: number) {
        this.input.enabled = false;
        let color = Phaser.Math.RND.pick(TILE.COLORS);
        const left2 = this.grid[row]?.[col - 2];
        const top2 = this.grid[row - 2]?.[col];

        while (left2?.fillColor == color || top2?.fillColor == color) {
            color = Phaser.Math.RND.pick(TILE.COLORS);
        }

        const tile = this.add
            .rectangle(
                col * TILE.SIZE + TILE.SIZE / 2,
                -TILE.SIZE,
                TILE.SIZE - 4,
                TILE.SIZE - 4,
                color,
            )
            .setStrokeStyle(TILE.WIDTH_STROKE, TILE.COLORS_STROKE)
            .setInteractive();

        this.grid[row][col] = tile;

        this.tilesToDrop++;
        this.tweens.add({
            targets: tile,
            y: row * TILE.SIZE + TILE.SIZE / 2,
            duration: TILE.DROP_DURATION,
            delay: col * 50 + row * 20,
            ease: 'Bounce.Out',
            onComplete: () => {
                this.tilesToDrop--;
                if (this.tilesToDrop === 0) {
                    this.input.enabled = true;
                }
            },
        });
    }

    swapTiles(row1: number, col1: number, row2: number, col2: number) {
        const tile1 = this.grid[row1][col1];
        const tile2 = this.grid[row2][col2];

        this.tweens.add({
            targets: tile1,
            x: col2 * TILE.SIZE + TILE.SIZE / 2,
            y: row2 * TILE.SIZE + TILE.SIZE / 2,
            duration: TILE.SWAP_DURATION,
            ease: 'Power2',
        });

        this.tweens.add({
            targets: tile2,
            x: col1 * TILE.SIZE + TILE.SIZE / 2,
            y: row1 * TILE.SIZE + TILE.SIZE / 2,
            duration: TILE.SWAP_DURATION,
            ease: 'Power2',
        });

        this.grid[row1][col1] = tile2;
        this.grid[row2][col2] = tile1;
    }

    checkMatches(): boolean {
        const matchedSet = new Set<string>();

        for (let row = 0; row < GRID.SIZE; row++) {
            for (let col = 0; col < GRID.SIZE - 2; col++) {
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

        for (let col = 0; col < GRID.SIZE; col++) {
            for (let row = 0; row < GRID.SIZE - 2; row++) {
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

        this.input.enabled = false;
        matchedSet.forEach(key => {
            const [row, col] = key.split(',').map(Number);
            this.grid[row][col].destroy();
            this.grid[row][col] = null!;
        });

        this.time.delayedCall(TILE.DESTROY_DURATION, () => {
            this.dropTiles();
        });

        return true;
    }

    dropTiles() {
        for (let col = 0; col < GRID.SIZE; col++) {
            let emptySpots = 0;
            for (let row = GRID.SIZE - 1; row >= 0; row--) {
                const tile = this.grid[row][col];
                if (!tile) {
                    emptySpots++;
                } else if (emptySpots > 0) {
                    this.grid[row + emptySpots][col] = tile;
                    this.grid[row][col] = null!;

                    this.tilesToDrop++;
                    this.tweens.add({
                        targets: tile,
                        y: tile.y + TILE.SIZE * emptySpots,
                        duration: TILE.DROP_DURATION,
                        ease: 'Bounce.Out',
                        onComplete: () => {
                            this.tilesToDrop--;
                            if (this.tilesToDrop === 0) {
                                this.input.enabled = true;
                            }
                        },
                    });
                }
            }

            for (let i = 0; i < emptySpots; i++) {
                this.createTile(i, col);
            }
        }

        this.time.delayedCall(TILE.DROP_DURATION + 100, () => {
            this.checkMatches();
        });
    }
}
