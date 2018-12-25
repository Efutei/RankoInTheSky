// phina.js をグローバル領域に展開
phina.globalize();

var ASSETS = {
  image: {
    ranko: './img/ranko.png',
    bgImg: './img/bg_pattern1_aozora.png',
    magicCircle: './img/mahoujin5.png',
    yaminoma: './img/yaminoma.png'
  },
  sound: {
    bgm: './sound/Ranko_in_the_Sky.mp3'
  },
};
var SCREEN_WIDTH  = 640;
var SCREEN_HEIGHT = 360;
var RANKO_START_X = SCREEN_WIDTH / 2 - 150;
var RANKO_START_Y = SCREEN_HEIGHT / 2 - 50;
var score;
var time;
var gameOverFlag = false;
var thisResult;
var rankTimeout;
var restrictionCount = 0;
var gotRank = false;
var rankMessage = "Rank: 取得中...";

phina.define('StartImage', {
  superClass: 'Sprite',
  init: function(){
    this.superInit('ranko', 386 * 0.8, 300 * 0.8);
    this.x = SCREEN_WIDTH / 2;
    this.y = SCREEN_WIDTH / 2 - 125;
  }
});

phina.define('TitleScene', {
  superClass: 'DisplayScene',
  /**
   * @constructor
   */
  init: function(params) {
    this.superInit(params);

    params = ({}).$safe(params, phina.game.TitleScene.defaults);

    this.backgroundColor = params.backgroundColor;
    this.startImage = StartImage().addChildTo(this);

    this.fromJSON({
      children: {
        titleLabel: {
          className: 'phina.display.Label',
          arguments: {
            text: params.title,
            fill: params.fontColor,
            stroke: null,
            fontSize: 64,
          },
          x: this.gridX.center(),
          y: this.gridY.span(1.8),
        }
      }
    });

    if (params.exitType === 'touch') {
      this.fromJSON({
        children: {
          touchLabel: {
            className: 'phina.display.Label',
            arguments: {
              text: "TOUCH START",
              fill: params.fontColor,
              stroke: null,
              fontSize: 32,
            },
            x: this.gridX.center(),
            y: this.gridY.span(14.8),
          },
        },
      });

      this.on('pointend', function() {
        this.exit();
      });
    }
  }

});

// MainScene クラスを定義
phina.define('MainScene', {
  superClass: 'DisplayScene',
  init: function() {
    this.superInit();
    //グローバル変数を初期値に
    score = 0;
    time = 30999;
    gameOverFlag = false;
    gotRank = false;
    thisResult = null;
    rankMessage = "Rank: 取得中...";
    if(restrictionCount > 0){//ランキング機能を制限
      restrictionCount -= 1;
    }
    // 背景色を指定
    this.backgroundColor = '#70caf1';
    this.bg0 = Bg().addChildTo(this);
    this.bg1 = Bg().addChildTo(this);
    this.ranko = Ranko().addChildTo(this);
    bgMoveSpeed = this.ranko.moveSpeedX;
    this.bg1.x = SCREEN_WIDTH*2 + 30;
    this.scoreText = ScoreText().addChildTo(this);
    this.timeText = TimeText().addChildTo(this);
    this.circles = [];
    this.circleCount = 0;
    SoundManager.playMusic('bgm');
  },
  update: function(app){
    time -= app.deltaTime;
    bgMoveSpeed = this.ranko.moveSpeedX;
    var p = app.pointer;
    if(p.getPointing()){
      this.ranko.noseUp();
    }else{
      this.ranko.noseDown();
    }
    this.spawnCircle();
    if(!gameOverFlag){
      this.hitTestCircle(this.ranko);
    }
    this.gameOver();
  },
  spawnCircle: function(){
    this.circleCount += bgMoveSpeed;
    if(this.circleCount >= 200 - score){
      this.circles.push(MagicCircle().addChildTo(this));
     this.circleCount = 0;
    }
  },
  hitTestCircle: function(ranko){
    this.circles.each(function(circle, index){
      if(circle.hitTestRect(ranko.x, ranko.y)){
        score += 1;
        circle.taken();
        this.circles.splice(index, 1);
      }
    }, this);
  },
  gameOver: function(){
    if(time <= 0 && !gameOverFlag){
      gameOverFlag = true;
      this.finishText = FinishText().addChildTo(this);
      gotRank = false; //リスタートが早い人対策
      if(restrictionCount === 0){
        this.getRank();
        rankMessage = 'Rank: 取得中...';
      }else{
        rankMessage = 'Rank: 制限中';
      }
    }
    if(time <= -2000){
      this.exit({
        score: score,
        message: rankMessage,
        hashtags: '蘭子inTheSky'
      });
    }
  },
  getRank: function(){
    rankTimeout = window.setTimeout(failedToFetch, 20000);
    var script = phina.asset.Script();
    var src = "https://script.google.com/macros/s/AKfycby2-qrBo4CGJ62E-gg7jEBdtsF2qnhUY6vt_dzSJbej236NeSo/exec?";
    src += "score="+score+"&callback=cameRankData";
    script.load(src);
  }
});

function cameRankData(json){
  window.clearTimeout(rankTimeout);
  rankMessage = "Rank: "+json.response.rank + " / " + json.response.total;
  if(thisResult){
    thisResult.rankingLabel.text = rankMessage;
  }
  gotRank = true;
}

function failedToFetch(){
  thisResult.rankingLabel.text = "Rank: 取得失敗";
  restrictionCount = 3;
}


phina.define('Bg', {
  superClass: 'Sprite',
  init: function(){
    this.superInit('bgImg', SCREEN_WIDTH * 2, SCREEN_HEIGHT);
    this.x = 0;
    this.y = SCREEN_HEIGHT / 2;
  },
  update: function(){
    this.move();
  },
  move: function(){
    this.x -= bgMoveSpeed;
    if(this.checkOutOfWindow()){
      this.x = SCREEN_WIDTH * 3;
    }
  },
  checkOutOfWindow: function(){
    return this.x < -SCREEN_WIDTH;
  }
});

phina.define('Ranko', {
  superClass: 'Sprite',
  init: function(){
    this.superInit('ranko', 386 * 0.3, 300 * 0.3);
    this.x = RANKO_START_X;
    this.y = RANKO_START_Y;
    this.defaultMoveSpeed = 8 + score; //角度を考慮しない値
    this.moveSpeedX = 5; //X方向へのスピード
    this.moveSpeedY = 0; //Y方向へのスピード
    this.degree = 0;
  },
  update: function(){
    this.move();
  },
  move: function(){
    this.changeSpeed();
    var outside = -20;
    if(this.y >= -outside && this.y <= SCREEN_HEIGHT + outside){
      this.y += this.moveSpeedY;
    }
    if(this.y < -outside){
      this.y = -outside;
    }
    if(this.y > SCREEN_HEIGHT + outside){
      this.y = SCREEN_HEIGHT + outside;
    }
  },
  changeSpeed: function(){
    this.defaultMoveSpeed = 8 + score * 0.4;
    this.setRotation(this.degree);
    var rad = Math.degToRad(this.degree);
    this.moveSpeedX = this.defaultMoveSpeed * rad.cos();
    this.moveSpeedY = this.defaultMoveSpeed * rad.sin();
  },
  noseUp: function(){
    if(this.degree > -54){
      this.degree -= 3;
    }
  },
  noseDown: function(){
    if(this.degree < 54){
      this.degree += 3;
    }
  }
});

phina.define('MagicCircle', {
  superClass: 'Sprite',
  init: function(){
    this.superInit('magicCircle', 100, 100);
    this.scaleX *= 0.3;
    this.x = SCREEN_WIDTH + 30;
    this.y = Random.randint(70, SCREEN_HEIGHT - 70);
  },
  update: function(){
    this.move();
  },
  move: function(){
    this.x -= bgMoveSpeed;
  },
  checkOutOfWindow: function(){
    return this.x < -SCREEN_WIDTH;
  },
  taken: function(){
    this.tweener
    .to({
      scaleX: 0.9,
      scaleY: 3,
      alpha: 0,
    },300,"swing")
    .call(function(){
      this.target.remove();
    })
    .play();
  }
});

phina.define('ScoreText',{
  superClass: 'Label',

  init: function(){
    this.superInit();
    this.x = SCREEN_WIDTH - (this.width + 30);
    this.y = SCREEN_HEIGHT - 20;
    this.fill = "white";
    this.stroke = "gray";
    this.text = "Score: " + score + " ";
  },
  update: function(){
    this.text = "Score: " + score + " ";
  }
});

phina.define('TimeText',{
  superClass: 'Label',

  init: function(){
    this.superInit();
    this.x = SCREEN_WIDTH - 270;
    this.y = SCREEN_HEIGHT - 20;
    this.fill = "white";
    this.stroke = "gray";
    this.text = "Time: " + Math.floor(time / 1000) + " ";
  },
  update: function(){
    if(time >= 0){
      this.text = "Time: " + Math.floor(time / 1000) + " ";
    }
  }
});

phina.define('FinishText',{
  superClass: 'Label',
  init: function(){
    this.superInit();
    this.x = SCREEN_WIDTH / 2;
    this.y = SCREEN_HEIGHT / 2;
    this.fill = "white";
    this.stroke = "gray";
    this.text = "おしまい！";
    this.fontSize = 64;
  },
})

phina.define('GameOverImage', {
  superClass: 'Sprite',
  init: function(){
    this.superInit('yaminoma', 334 * 0.9, 220 * 0.9);
    this.x = SCREEN_WIDTH / 2;
    this.y = SCREEN_WIDTH / 2 - 127;
  }
});

// リザルトシーン上書き
phina.define('ResultScene', {
  superClass: 'DisplayScene',
  /**
   * @constructor
   */
  init: function(params) {
    params = ({}).$safe(params, phina.game.ResultScene.defaults);
    this.superInit(params);

    var message = params.message.format(params);

    this.backgroundColor = params.backgroundColor;
    thisResult = this;
    this.gameOverImage = GameOverImage().addChildTo(this);

    this.fromJSON({
      children: {
        scoreText: {
          className: 'phina.display.Label',
          arguments: {
            text: 'Score: '+params.score,
            fill: params.fontColor,
            stroke: null,
            fontSize: 50,
          },
          x: this.gridX.span(8),
          y: this.gridY.span(1.5),
        },

        rankingLabel: {
          className: 'phina.display.Label',
          arguments: {
            text: message,
            fill: params.fontColor,
            stroke: null,
            fontSize: 30,
          },
          x: this.gridX.span(8),
          y: this.gridY.span(3.5),
        },

        shareButton: {
          className: 'phina.ui.Button',
          arguments: [{
            text: '★',
            width: 70,
            height: 70,
            fontColor: params.fontColor,
            fontSize: 50,
            cornerRadius: 32,
            fill: 'rgba(240, 240, 240, 0.5)',
            // stroke: '#aaa',
            // strokeWidth: 2,
          }],
          x: this.gridX.center(-2),
          y: this.gridY.span(14.5),
        },
        playButton: {
          className: 'phina.ui.Button',
          arguments: [{
            text: '▶',
            width: 70,
            height: 70,
            fontColor: params.fontColor,
            fontSize: 50,
            cornerRadius: 32,
            fill: 'rgba(240, 240, 240, 0.5)',
            // stroke: '#aaa',
            // strokeWidth: 2,
          }],
          x: this.gridX.center(2),
          y: this.gridY.span(14.5),

          interactive: true,
          onpush: function() {
            this.exit();
          }.bind(this),
        },
      }
    });

    if (params.exitType === 'touch') {
      this.on('pointend', function() {
        this.exit();
      });
    }

    this.shareButton.onclick = function() {
      var text;
      if(gotRank){
        text = 'Score: {0}\n{1}\n{2}\n'.format(params.score, this.parent.rankingLabel.text, "やみのま!");
      }else{
        text = 'Score: {0}\n{1}\n'.format(params.score, "やみのま!");
      }
      var url = phina.social.Twitter.createURL({
        text: text,
        hashtags: params.hashtags,
        url: params.url,
      });
      window.open(url, 'share window', 'width=480, height=320');
    };
  },
});

// メイン処理
phina.main(function() {
  // アプリケーション生成
  var app = GameApp({
    title: '蘭子 in the Sky',
    startLabel: 'title',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    assets: ASSETS,
    fontColor: 'white',
    backgroundColor: 'skyblue',
  });
  //iphone用ダミー音
  app.domElement.addEventListener('touchend', function dummy() {
    var s = phina.asset.Sound();
    s.loadFromBuffer();
    s.play().stop();
    app.domElement.removeEventListener('touchend', dummy);
  });
  // アプリケーション実行
  app.run();
});
