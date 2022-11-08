const hashRegex = /#.*$/;

function canonicalUrl() {
  if (typeof window === 'undefined') return;
  const tags = document.getElementsByTagName('link');
  for (var i = 0, tag; (tag = tags[i]); i++) {
    if (tag.getAttribute('rel') === 'canonical') {
      return tag.getAttribute('href');
    }
  }
}

function currentUrl(search) {
  const canonical = canonicalUrl();
  if (!canonical) return window.location.href.replace(hashRegex, '');
  return canonical.match(/\?/) ? canonical : canonical + search;
}

function urlPath(url) {
  const regex = /(http[s]?:\/\/)?([^\/\s]+\/)(.*)/g;
  const matches = regex.exec(url);
  const pathMatch = matches && matches[3] ? matches[3].split('?')[0].replace(hashRegex, '') : '';
  return '/' + pathMatch;
}

export const getPageData = (pageData = {}) => {
  if (typeof window === 'undefined') return pageData;
  const { title, referrer } = document;
  const { location, innerWidth, innerHeight } = window;
  const { hash, search } = location;
  const url = currentUrl(search);
  const page = {
    title: title,
    url: url,
    path: urlPath(url),
    hash: hash,
    search: search,
    width: innerWidth,
    height: innerHeight,
    referrer: undefined
  };
  if (referrer && referrer !== '') {
    page.referrer = referrer;
  }

  return {
    ...page,
    ...pageData
  };
};
