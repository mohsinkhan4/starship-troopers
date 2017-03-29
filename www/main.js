function gameEnd(lose) {
	timer.stop();
	if(lose && !winText.visible) loseText.visible = true;
	else if(!loseText.visible) winText.visible = true;
}

var width = document.getElementById('gameDiv').clientWidth, height = 520;

var mainState = { preload: preload, create: create, update: update };
var game = new Phaser.Game(width, height, Phaser.CANVAS, 'gameDiv', mainState);
var game_started;

var spaceField;
var backgroundv = 5;

var player;

var cursors, button;

var bullets, fireButton;
var bulletTime = 0;

var enemies;
var enemies_column = 4 * height/720, enemies_row = 10 * width/980 - 1;

var score, timeCount;
var descendFactor;
var scoreText, winText;

var button_left, button_right, button_shoot;
var button_left_status, button_right_status, button_shoot_status = false;

var enemyCount;
var enemy_x_displacement = (width - 300)/3 - 50;

var tween;

function preload () {
	/* load assets */
	game.load.image('background-starfield', 'images/stars.png');
	game.load.image('player', 'images/spaceship.png');
	game.load.image('beam', 'images/fire.png');
	game.load.image('enemy', 'images/enemy.png');
	game.load.image('button_shoot', 'images/shoot.png');
	game.load.image('button_right', 'images/button_right.png');
	game.load.image('button_left', 'images/button_left.png');
	game.load.image('button_restart', 'images/restart.png');
	game.load.image('button_play', 'images/play.png');
}

function create() {

	spaceField = game.add.tileSprite(0, 0, width, height, 'background-starfield');

	player = game.add.sprite(game.world.centerX, game.world.centerY + 160 * height/720, 'player');
	game.physics.enable(player, Phaser.Physics.ARCADE);

	score = enemyCount = descendFactor = 0;
	timeCount = 30;
	game_started = false;

	var button_scales = {
		w: width/980 < 1 ? 0.5 * width/980 : 0.5,
		h: height/720 < 1 ? 0.5 * height/720 : 0.5
	}
	button_left = game.add.button(game.world.centerX - 470 * width/980,  game.world.centerY + 260 * height/720, 'button_left', null, this, 0, 0, 1);
	button_left.scale.set(button_scales.w, button_scales.h)
	button_left.onInputUp.add(button_left_up, this);
	button_left.onInputDown.add(button_left_down, this);

	button_right = game.add.button(game.world.centerX - 350 * width/980,  game.world.centerY + 260 * height/720, 'button_right', null, this, 0, 0, 1);
	button_right.scale.set(button_scales.w, button_scales.h)
	button_right.onInputUp.add(button_right_up, this);
	button_right.onInputDown.add(button_right_down, this);

	button_shoot = game.add.button(game.world.centerX + 350 * width/980,  game.world.centerY + 250 * height/720, 'button_shoot', null, this, 0, 0, 1);
	button_shoot.scale.set(button_scales.w, button_scales.h - 0.1)
	button_shoot.onInputUp.add(button_shoot_up, this);
	button_shoot.onInputDown.add(button_shoot_down, this);

	button_restart = game.add.button(game.world.centerX + 100 * width/980,  game.world.centerY + 260 * height/720, 'button_restart', null, this, 0, 0, 1);
	button_restart.scale.set(0.1, 0.1)
	button_restart.onInputDown.add(button_restart_down, this);

	button_play = game.add.button(game.world.centerX - 50,  game.world.centerY - 50, 'button_play', null, this, 0, 0, 1);
	// button_play.scale.set(button_scales.w, button_scales.h)
	button_play.onInputDown.add(button_play_down, this);

	cursors = game.input.keyboard.createCursorKeys();

	bullets = game.add.group();
	bullets.enableBody = true;
	bullets.physicsBodyType = Phaser.Physics.ARCADE;
	bullets.createMultiple(30, 'beam');
	bullets.setAll('anchor.x', 1);
	bullets.setAll('anchor.y', 0.25);
	bullets.setAll('outOfBoundsKill', true);
	bullets.setAll('checkWorldBounds', true);
	// bullets.setAll('scale', 0.25);
	// bullets.scale.set(0.05, 0.05);

	fireButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);

	enemies = game.add.group();
	enemies.enableBody = true;
	enemies.physicsBodyType = Phaser.Physics.ARCADE;
	createEnemies(enemies_row, enemies_column);

	scoreText = game.add.text(game.world.centerX - 200 * width/980, game.world.centerY + 280 * height/720, "Score:", {font: '16px Arial', fill: '#fff'});

	winText = game.add.text(game.world.centerX, game.world.centerY, 'You Win', {font: '32px Arial', fill: '#fff'});
	winText.visible = false;

	loseText = game.add.text(game.world.centerX, game.world.centerY, 'You Lose', {font: '32px Arial', fill: '#fff'});
	loseText.visible = false;

	timeText = game.add.text(game.world.centerX - 200 * width/980, game.world.centerY + 300 * height/720, "Time:", {font: '16px Arial', fill: '#fff'});

  timer = game.time.create(false);
  timer.loop(1000, updateTime, this);
  timer.start();
	// window.addEventListener("deviceorientation", handleOrientation, true);
}

function update() {

	if(!game_started) { timer.pause(); tween.pause(); return;}
	else { timer.resume(); tween.resume(); }

	game.physics.arcade.overlap(bullets, enemies, collisionHandler, null, this);
	game.physics.arcade.overlap(player, enemies, collisionHandlerX, null, this);

	player.body.velocity.x = 0;

	spaceField.tilePosition.y += backgroundv;

	if(cursors.left.isDown || button_left_status){ player.body.velocity.x = -350; }
	if(cursors.right.isDown || button_right_status){ player.body.velocity.x = 350; }

	if(fireButton.isDown || button_shoot_status) { fireBullet(); }

	scoreText.text = 'Score: ' + score;
	if((score && score === enemyCount) || timeCount === 0){
		gameEnd();
	}
}

function updateTime(e){
    if(timeCount > 0) timeCount--;
    timeText.text = 'Time: ' + timeCount;
}

function fireBullet(){
	if(game.time.now > bulletTime){
		bullet = bullets.getFirstExists(false);

		if(bullet) {
			// bullet.reset((player.x + 25)/0.05, player.y/0.05);
			bullet.reset(player.x + 25, player.y);
			bullet.body.velocity.y = -500;
			bulletTime = game.time.now + 200;
		}
	}
}

function createEnemies(row, column){
	for(var x = 0; x < row; x++){
		for(var y = 0; y < column; y++){
			var enemy = enemies.create(x * 50 + enemy_x_displacement, y * 50, 'enemy');
			enemy.anchor.setTo(0.5, 0.5);
			enemy.scale.setTo(0.05, 0.05);
			enemyCount ++;
		}
	}

	enemies.x = 100;
	enemies.y = 50;

	tween = game.add.tween(enemies)
		.to({x:200}, 2000, Phaser.Easing.Linear.None, true, 0, 1000, true);
	tween.onRepeat.add(descend, this);

}

function createMoreEnemies(f){
	if (f % 2) return;
	for(var x = 0; x < enemies_row; x++){
		var enemy = enemies.create(x * 50 + enemy_x_displacement, -50 * f/2, 'enemy');
		enemyCount++;
		enemy.anchor.setTo(0.5, 0.5);
		enemy.scale.setTo(0.05, 0.05);
	}
	// var r = Math.random();
  // var x = (200 + Math.random() * 1000) % (800/2);
  // var y = -(Math.random() * 200) % (600/8);
}

function descend(){
	if(winText.visible || loseText.visible) return;


  // for recreate
	descendFactor++;
  createMoreEnemies(descendFactor);

  // for respawn
  var e = enemies.getFirstExists(false);
  // if (e)
  // {
  //     e.revive();
  //     enemyCount++;
  // }
	enemies.y += (25 + descendFactor * 5);
}

function collisionHandler(bullet, enemy){
	bullet.kill();
	enemy.kill();
	score += 1;
}

function collisionHandlerX() {
	player.kill();
	gameEnd('lose');
}

function handleOrientation(e) {
	// incomplete
	if (e.alpha > 270) {alert(e.alpha)
	button_left.y = game.world.centerY;
	button_right.y = game.world.centerY;}
}

function button_left_up() {
	button_left_status = false;
}
function button_left_down() {
	button_left_status = true;
}
function button_right_up() {
	button_right_status = false;
}
function button_right_down() {
	button_right_status = true;
}
function button_shoot_up() {
	button_shoot_status = false;
}
function button_shoot_down() {
	button_shoot_status = true;
}

function button_restart_down() {
	this.game.state.start('mainState');
}

function button_play_down() {
	game_started = true;
	button_play.visible = false;
}

game.state.add('mainState', mainState);
game.state.start('mainState')
