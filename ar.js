import createjs from "createjs-npm";

let canvas;
let stage;
// 定义 4 个方向
let rotations = [90, 180, 270];
// 保存当前方向索引
let zoom = 0;
let flag = true;
let hasClick = false;
let container;

let node = document.getElementById("ar");
node.style.width = 100 * (zoom + 1) + "px";

node.style.height = 100 * (zoom + 1) + "px";

canvas = document.getElementById("gameView");
stage = new createjs.Stage(canvas);
container = new createjs.Container();

stage.addChild(container);
container.x = -50;
container.y = 75;

var content = new createjs.DOMElement(node);
container.addChild(content);
stage.update();

// 将容器shape向右向下移动50，此时注册点也移动到了标准坐标系(50, -50)处
content.x = 50;
content.y = 50;
// 通过regX再给容器移动到原来的位置，此时“身体“进行了移动，但是注册点并没有移动
content.regX = 50;
content.regY = 50;

export function change() {
  let temp1 = Math.floor(Math.random() * 3);
  let temp = rotations[temp1];

  zoom = zoom + temp1 < 3 ? zoom + temp1 + 1 : zoom + temp1 - 3;
  
  content.rotation = content.rotation + temp;
  // [1,10]
  let temp2 = Math.random() * 10 + 1; // [1, 11)
  while (temp2 > 10) {
    temp2 = Math.random() * 10 + 1;
  }
  let temp3 = temp2 * 0.1;
  content.scaleX = temp3;
  content.scaleY = temp3;
  stage.update();
  return zoom;
}

export function func() {
  // 改变图像
  change();
  let t = 6;
  let x = setInterval(function () {
    t--;
    if (t < 0 || flag === false) {
      clearInterval(x);
      alert("gameover");
    } else {
      console.log("还有" + t + "秒");
    }
    if (flag === true && hasClick) {
      clearInterval(x);
      hasClick = false;
      func();
    }
  }, 1000);
}
