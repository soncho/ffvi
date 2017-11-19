class HintOperator {
  constructor() {
    this.map = {};
    this.input_keys = '';
  }

  push(code, elem) {
    var hint = this._createHintElem(code);
    elem.style.position="relative";
    elem.appendChild(hint);

    this.map[code] = {
      elem: elem,
      hint: hint
    };
  }

  reduce(key) {
    // if (del) this.input_keys = this.input_keys.slice(0, -1);

    this.input_keys += key

    var isMatch = false;
    for (code in this.map) {
      if (!code.startsWith(this.input_keys))
        this.map[code].hint.style.display = 'none';
      else {
        isMatch = true;
        // this.map[code].hint.style.display = '';
      }
    }
    return isMatch;
  }

  clear() {
    for (code in this.map) {
      this.map[code].hint.remove();
    }
    this.map = {};
    this.input_keys = '';
  }

  get_elem() {
    return this.map[this.input_keys].elem;
  }

  _createHintElem(code) {
    var hint = document.createElement('span');
    hint.textContent = code;
    hint.style.font = '12px bold';
    hint.style.backgroundColor='yellow'
    hint.style.position='absolute';
    hint.style.top='0';
    hint.style.left='0';
    hint.style.padding='0.1em';

    return hint;
  }
}

var ffvi = (function() {

const STATE = {
  NORMAL: 1,
  GOTO: 2,
  FOLLOW: 3,
  INSERT: 4
}

var curState = STATE.NORMAL;
var ho = new HintOperator();
var newTab = false;

function normal(key) {
  switch (key) {
    // Move
    case 'j':
      scrollByLines(5);
      break;

    case 'k':
      scrollByLines(-5);
      break;

    case 'h':
      chrome.runtime.sendMessage({action: 'move_left_tab'});
      break;

    case 'l':
      chrome.runtime.sendMessage({action: 'move_right_tab'});
      break;

    case 'g':
      curState = STATE.GOTO;
      break;

    case 'G':
      scrollTo(window.scrollX, document.body.scrollHeight);
      break;

    case 'C-d':
      scrollBy(0, window.innerHeight / 2);
      break;

    case 'C-u':
      scrollBy(0, -window.innerHeight / 2);
      break;

    case 'y':
      copyToClipboard(location.href);
      chrome.runtime.sendMessage({action: 'yank_url', url: location.href});
      break;

    // Tab
    case 't':
      chrome.runtime.sendMessage({action: 'create_new_tab'});
      break;

    case 'd':
      chrome.runtime.sendMessage({action: 'close_tab', focusLeft: false});
      break;

    case 'r':
      chrome.runtime.sendMessage({action: 'reload_tab'});
      break;

    case 'u':
      break;

    case 'p':
      // ToDo: refer clipboard
      chrome.runtime.sendMessage({action: 'paste_url', newTab: false});
      break;

    case 'P':
      // ToDo: refer clipboard
      chrome.runtime.sendMessage({action: 'paste_url', newTab: true});
      break;

    // Follow
    case 'f':
      curState = STATE.FOLLOW;
      newTab = false;
      showHint();
      break;

    case 'F':
      curState = STATE.FOLLOW;
      newTab = true;
      showHint();
      break;

  }
}

function goto_(key) {
  switch (key) {
    case 'g':
      scrollTo(0, 0);
      break;
  }
  curState = STATE.NORMAL;
}

function follow(key) {
  switch (key) {
    case 'Escape':
      ho.clear();
      curState = STATE.NORMAL;
      break;

    case 'Enter':
      var elem = ho.get_elem();
      if (newTab)
        chrome.runtime.sendMessage({action: 'create_new_tab',
                                    url: elem.href});
      else
        ho.get_elem().click();

      ho.clear();
      curState = STATE.NORMAL;
      break;

    default:
      if (!ho.reduce(key)) {
        ho.clear();
        curState = STATE.NORMAL;
      }
  }
}


function showHint() {
  var elems = document.querySelectorAll('a');
  code = 1;
  elems.forEach(function(elem) {
    ho.push(code++, elem);
  });
}



function copyToClipboard(str) {
  var tmp = document.createElement('p');
  tmp.innerHTML = str;
  document.body.appendChild(tmp);
  document.getSelection().selectAllChildren(tmp);
  document.execCommand('copy');
  document.body.removeChild(tmp);
}

return function (key) {
  // console.log(curState);
  switch(curState) {
    case STATE.NORMAL:
      normal(key);
      break;
    case STATE.GOTO:
      goto_(key);
      break;
    case STATE.FOLLOW:
      follow(key);
      break;
    case STATE.INSERT:
      break;
  }
}

})();

document.addEventListener('keypress', function(event) {
  let key = (event.ctrlKey ? 'C-' : '') + event.key;
  console.log(key);
  ffvi(key);

});

window.document.onkeydown = function(event) {
  // disable backspace
  if (event.which == 8) return false;
}
