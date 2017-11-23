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
    hint.style.color = 'black';
    hint.style.font = '12px bold';
    hint.style.backgroundColor = 'yellow'
    hint.style.position = 'absolute';
    hint.style.top = '0';
    hint.style.left = '0';
    hint.style.padding = '0.1em';
    hint.style.zIndex = 2139999998;

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
var search_form = null;

function normal(key) {
  switch (key) {
    case 'q':
      getClipboardValue();
      break;
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

    case 'H':
      history.back();
      break;

    case 'L':
      history.forward();
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
    case 'd':
      chrome.runtime.sendMessage({action: 'close_tab', focusLeft: false});
      break;

    case 'r':
      chrome.runtime.sendMessage({action: 'reload_tab'});
      break;

    case 'u':
      break;

    // Search
    case 'o':
      curState = STATE.INSERT;
      newTab = false;
      showSearchForm();
      break;

    case 't':
      curState = STATE.INSERT;
      newTab = true;
      showSearchForm();
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

    case 'I':
      curState = STATE.INSERT;
      break;

    case 'Escape':
      document.activeElement.blur();
      break;

    default:
      return true;
  }
  return false;
}

function goto_(key) {
  switch (key) {
    case 'g':
      scrollTo(0, 0);
      break;

    case 'h':
      chrome.runtime.sendMessage({action:'go_home'});
      break;
  }
  curState = STATE.NORMAL;
  return false;
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
  return false;
}

function insert(key) {
  switch (key) {
    case 'Escape':
      curState = STATE.NORMAL;
      document.activeElement.blur();
      clearSearchForm();
      break;

    case 'Enter':
      curState = STATE.NORMAL;
      chrome.runtime.sendMessage({action: 'search',
                                  query: document.activeElement.value,
                                  newTab: newTab});
      clearSearchForm();
      break;

  }

  return true;
}

function showHint() {
  var elems = document.querySelectorAll('a');
  code = 1;
  elems.forEach(function(elem) {
    ho.push(code++, elem);
  });
}

function showSearchForm() {
  search_form = document.createElement('input');
  search_form.style.position = 'fixed';
  search_form.style.left = 0;
  search_form.style.top = 0;
  search_form.style.zIndex = 2139999999;

  document.body.appendChild(search_form);

  search_form.focus();
}

function clearSearchForm() {
  if (search_form) {
        document.body.removeChild(search_form);
        search_form = null;
  }
}

function copyToClipboard(str) {
  var tmp = document.createElement('p');
  tmp.innerHTML = str;
  document.body.appendChild(tmp);
  document.getSelection().selectAllChildren(tmp);
  document.execCommand('copy');
  document.body.removeChild(tmp);
}

function getClipboardValue() {
  var tmp = document.createElement('textarea');
  document.body.appendChild(tmp);

  tmp.focus();
  document.execCommand('Paste');
}

return {
  ffvi: function (key) {
    console.log(curState);
    var res = false;
    switch (curState) {
      case STATE.NORMAL:
        res = normal(key);
        break;
      case STATE.GOTO:
        res = goto_(key);
        break;
      case STATE.FOLLOW:
        res = follow(key);
        break;
      case STATE.INSERT:
        res = insert(key);
        break;
    }
    return res;
  },

  setNormal: function() {
    curState = STATE.NORMAL;
  },

  setInsert: function() {
    curState = STATE.INSERT;
  },
}

})();

window.document.onkeydown = function(event) {
  let key = (event.ctrlKey ? 'C-' : '') + event.key;
  if (!event.metaKey)
    return ffvi.ffvi(key);
  return true;
}


window.addEventListener('load', function() {
  document.addEventListener('focusin', function(event) {
    if (['INPUT', 'TEXTAREA'].includes(event.target.tagName))
      ffvi.setInsert();
  });

  document.addEventListener('focusout', function(event) {
    if (['INPUT', 'TEXTAREA'].includes(event.target.tagName))
      ffvi.setNormal();
  });
})

window.addEventListener('paste', function(e) {
  // var clipboardData = e.clipboardData;
  console.log(e.clipboardData);

});
