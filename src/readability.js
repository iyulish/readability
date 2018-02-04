import jsdom from 'jsdom-jscore';
//var request = require('request');
var helpers = require('./helpers');
//var encodinglib = require("encoding");
//var urllib = require('url');

exports.debug = function(debug) {
  helpers.debug(debug);
};

exports.debug(false);

function Readability(window, options) {
  this._window = window;
  this._document = window.document;
  this.iframeLoads = 0;
  // Cache the body HTML in case we need to re-use it later
  this.bodyCache = null;
  this._articleContent = '';
  helpers.setCleanRules(options.cleanRulers || []);

  this.cache = {};

  helpers.prepDocument(this._document);
  this.cache = {
    'body': this._document.body.innerHTML
  };

  this.__defineGetter__('content', function() {
    return this.getContent(true);
  });
  this.__defineGetter__('title', function() {
    return this.getTitle(true);
  });
  this.__defineGetter__('textBody', function() {
    return this.getTextBody(true);
  });
  this.__defineGetter__('html', function() {
    return this.getHTML(true);
  });
  this.__defineGetter__('document', function() {
    return this.getDocument(true);
  });
}

Readability.prototype.close = function() {
  if (this._window) {
    this._window.close();
  }
  this._window = null;
  this._document = null;
};

Readability.prototype.getContent = function(notDeprecated) {
  if (!notDeprecated) {
    console.warn('The method `getContent()` is deprecated, using `content` property instead.');
  }
  if (typeof this.cache['article-content'] !== 'undefined') {
    return this.cache['article-content'];
  }

  var articleContent = helpers.grabArticle(this._document);
  if (helpers.getInnerText(articleContent, false) === '') {
    this._document.body.innerHTML = this.cache.body;
    articleContent = helpers.grabArticle(this._document, true);
    if (helpers.getInnerText(articleContent, false) === '') {
      return this.cache['article-content'] = false;
    }
  }

  return this.cache['article-content'] = articleContent.innerHTML;
};

Readability.prototype.getTitle = function(notDeprecated) {
  if (!notDeprecated) {
    console.warn('The method `getTitle()` is deprecated, using `title` property instead.');
  }
  if (typeof this.cache['article-title'] !== 'undefined') {
    return this.cache['article-title'];
  }

  var title = _findMetaTitle(this._document) || this._document.title;
  var betterTitle;
  var commonSeparatingCharacters = [' | ', ' _ ', ' - ', '«', '»', '—'];

  var self = this;
  commonSeparatingCharacters.forEach(function(char) {
    var tmpArray = title.split(char);
    if (tmpArray.length > 1) {
      if (betterTitle) return self.cache['article-title'] = title;
      betterTitle = tmpArray[0].trim();
    }
  });

  if (betterTitle && betterTitle.length > 10) {
    return this.cache['article-title'] = betterTitle;
  }

  return this.cache['article-title'] = title;
};

Readability.prototype.getTextBody = function(notDeprecated) {
  if (!notDeprecated) {
    console.warn('The method `getTextBody()` is deprecated, using `textBody` property instead.');
  }
  if (typeof this.cache['article-text-body'] !== 'undefined') {
    return this.cache['article-text-body'];
  }

  var articleContent = helpers.grabArticle(this._document);
  var rootElement = articleContent.childNodes[0];
  var textBody = '';
  if (rootElement) {
    var textElements = rootElement.childNodes;
    for (var i = 0; i < textElements.length; i++) {
      var el = textElements[i];
      var text = helpers.getInnerText(el);
      if (!text) continue;
      textBody += text;
      if ((i + 1) < textElements.length) textBody += '\n';
    }
  }

  return this.cache['article-text-body'] = textBody;
}

Readability.prototype.getDocument = function(notDeprecated) {
  if (!notDeprecated) {
    console.warn('The method `getDocument()` is deprecated, using `document` property instead.');
  }
  return this._document;
};

Readability.prototype.getHTML = function(notDeprecated) {
  if (!notDeprecated) {
    console.warn('The method `getHTML()` is deprecated, using `html` property instead.');
  }
  return this._document.getElementsByTagName('html')[0].innerHTML;
};

function _findMetaTitle(document) {
  var metaTags = document.getElementsByTagName('meta');
  var tag;

  for(var i = 0; i < metaTags.length; i++) {
    tag = metaTags[i];

    if(tag.getAttribute('property') === 'og:title' || tag.getAttribute('name') === 'twitter:title'){
      return tag.getAttribute('content');
    }
  }
  return null;
}

function _findHTMLCharset(htmlbuffer) {

  var body = htmlbuffer.toString("ascii"),
    input, meta, charset;

  if (meta = body.match(/<meta\s+http-equiv=["']content-type["'][^>]*?>/i)) {
    input = meta[0];
  }

  if (input) {
    charset = input.match(/charset\s?=\s?([a-zA-Z\-0-9]*);?/);
    if (charset) {
      charset = (charset[1] || "").trim().toLowerCase();
    }
  }

  if (!charset && (meta = body.match(/<meta\s+charset=["'](.*?)["']/i))) {
    charset = (meta[1] || "").trim().toLowerCase();
  }

  return charset;
}

function _parseContentType(str) {
  if (!str) {
    return {};
  }
  var parts = str.split(";"),
    mimeType = parts.shift(),
    charset, chparts;

  for (var i = 0, len = parts.length; i < len; i++) {
    chparts = parts[i].split("=");
    if (chparts.length > 1) {
      if (chparts[0].trim().toLowerCase() == "charset") {
        charset = chparts[1];
      }
    }
  }

  return {
    mimeType: (mimeType || "").trim().toLowerCase(),
    charset: (charset || "UTF-8").trim().toLowerCase() // defaults to UTF-8
  };
}

function read(url) {
  return fetch(url)
    .then(response => response.text())
    .then(webpage => {
      return new Promise(function(resolve, reject) { jsdom.env(webpage, function(errors, window) {
          //var el = window.document.querySelector('body');
          //self.renderChart(window, el);
          try {         
            var options = {};
            options.encoding = null;
            var article = new Readability(window, options);         
            let dom = article.document;
            let style = 'img {max-width: 100%; height: auto;}';
            let html = '<html><head><style type="text/css">'+style+'</style><meta charset="utf-8"><title>'+dom.title+'</title></head><body><h1>'+article.title+'</h1>'+article.content+'</body></html>';
            return resolve(html);
          } catch (ex) {
            return reject(ex);
          }
  
        })
      })
    });
}

module.exports = read;
module.exports.read = function() {
  console.warn('`readability.read` is deprecated. Just use `var read = require("node-readability"); read(url...);`.');
  return read.apply(this, arguments);
};
