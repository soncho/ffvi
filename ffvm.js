class HintOperator {
  constructor() {
    this.map = {};
    this.input_keys = '';
    this.zIndex = 2140000000;

    var self = this
    window.addEventListener('load', function() {
      self.divElem = document.createElement('div');
      document.lastChild.appendChild(self.divElem);
    })
  }

  push(code, elem) {
    var hint = this._createHintElem(code, elem);
    this.divElem.appendChild(hint);


    this.map[code] = {
      elem: elem,
      hint: hint
    };
  }

  reduce(key) {

    this.input_keys += key

    var isMatch = false;
    for (code in this.map) {
      if (!code.startsWith(this.input_keys))
        this.map[code].hint.style.display = 'none';
      else
        isMatch = true;
    }
    return isMatch;
  }

  undo() {
    if (!this.input_keys) return
    this.input_keys = this.input_keys.slice(0, -1);
    for (code in this.map) {
      if (code.startsWith(this.input_keys))
        this.map[code].hint.style.display = '';
    }
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

  _createHintElem(code, elem) {
    var rect = elem.getBoundingClientRect();

    var hint = document.createElement('span');
    hint.textContent = code;
    hint.style.color = 'black';
    hint.style.font = '12px bold';
    hint.style.backgroundColor = 'yellow'
    hint.style.position = 'absolute';
    hint.style.top = (document.scrollingElement.scrollTop + rect.top) + 'px';
    hint.style.left = (document.scrollingElement.scrollLeft + rect.left) + 'px';
    hint.style.padding = '0.1em';
    hint.style.zIndex = this.zIndex++;

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
var formTagNames = ['INPUT', 'TEXTAREA']

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
      break;

    // Tab
    case 'd':
      chrome.runtime.sendMessage({action: 'close_tab', focusLeft: false});
      break;

    case 'r':
      chrome.runtime.sendMessage({action: 'reload_tab'});
      break;

    case 'u':
      chrome.runtime.sendMessage({action: 'restore_tab'});
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
      search(getClipboardValue(), false);
      break;

    case 'P':
      search(getClipboardValue(), true);
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
      if (formTagNames.includes(elem.tagName)) {
        elem.focus();
      }
      else if (newTab)
        chrome.runtime.sendMessage({action: 'create_new_tab',
                                    url: elem.href});
      else
        elem.click();

      ho.clear();
      curState = STATE.NORMAL;
      break;

    case 'Backspace':
      ho.undo();
      break;

    default:
      if (!ho.reduce(key)) {
        ho.clear();
        curState = STATE.NORMAL;
      }
      break;
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
      if (search_form) {
        search(document.activeElement.value, newTab);
        clearSearchForm();
      }
      break;
  }

  return true;
}

function showHint() {
  var elems = document.querySelectorAll('a, input, textarea');
  code = 1;
  elems.forEach(function(elem) {
    if (isVisibleElement(elem) && isElementInScreen(elem))
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
  tmp.contentEditable = true;
  tmp.style.position = 'absolute';
  tmp.style.top = document.scrollingElement.scrollTop + 'px';
  tmp.style.left = '-100px';
  document.body.appendChild(tmp);
  tmp.focus(); // set insert mode

  document.execCommand('paste');
  value = tmp.textContent;
  tmp.blur();  // set normal mode

  document.body.removeChild(tmp);

  return value;
}

function search(value, newTab) {
  if (value.startsWith('http://') || value.startsWith('https://'))
    chrome.runtime.sendMessage({action: 'paste_url',
                                url: value,
                                newTab: newTab});
  else
    chrome.runtime.sendMessage({action: 'search',
                                query: value,
                                newTab: newTab});
}

function isVisibleElement(elem) {
  return elem.style.display != 'none' &&
         getComputedStyle(elem).visibility != 'hidden';
}

function isElementInScreen(elem) {
  var rect = elem.getBoundingClientRect();
  return (rect.top > 0 && rect.top < window.innerHeight) &&
         (rect.left > 0 && rect.left < window.innerWidth)
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

  formTagNames: formTagNames,
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
    if (ffvi.formTagNames.includes(event.target.tagName))
      ffvi.setInsert();
  });

  document.addEventListener('focusout', function(event) {
    if (ffvi.formTagNames.includes(event.target.tagName))
      ffvi.setNormal();
  });
})
