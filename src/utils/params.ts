export function decodeUri(s) {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '));
  } catch (e) {
    return null;
  }
}

function assign(obj, keyPath, value) {
  var lastKeyIndex = keyPath.length - 1;
  for (var i = 0; i < lastKeyIndex; ++i) {
    var key = keyPath[i];
    if (key === '__proto__' || key === 'constructor') {
      break;
    }
    if (!(key in obj)) {
      obj[key] = {};
    }
    obj = obj[key];
  }
  obj[keyPath[lastKeyIndex]] = value;
}

function getSearchString(url?: string) {
  if (url) {
    const p = url.match(/\?(.*)/);
    return p && p[1] ? p[1].split('#')[0] : '';
  }
  return typeof window !== 'undefined' && window.location.search.substring(1);
}

function getParamsAsObject(query: string) {
  let params = Object.create(null);
  let temp;
  const re = /([^&=]+)=?([^&]*)/g;

  while ((temp = re.exec(query))) {
    var k = decodeUri(temp[1]);
    var v = decodeUri(temp[2]);
    if (k.substring(k.length - 2) === '[]') {
      k = k.substring(0, k.length - 2);
      (params[k] || (params[k] = [])).push(v);
    } else {
      params[k] = v === '' ? true : v;
    }
  }

  for (var prop in params) {
    var arr = prop.split('[');
    if (arr.length > 1) {
      assign(
        params,
        arr.map((x) => x.replace(/[?[\]\\ ]/g, '')),
        params[prop]
      );
      delete params[prop];
    }
  }
  return params;
}

export function paramsParse(url?: string) {
  return getParamsAsObject(getSearchString(url));
}
