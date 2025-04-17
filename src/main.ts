import Phaser from 'phaser';
import Match3Scene from './scenes/Match3Scene';
import './style.css';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'app',
    width: 512,
    height: 512,
    backgroundColor: '#222',
    scene: [Match3Scene],
};

new Phaser.Game(config);
