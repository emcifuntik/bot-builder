function require(url) {
  if(!Array.isArray(url))
    url = [ url ];
  if(url.length == 0)
    return;
  let script = document.createElement('script');
  script.src = url[0] + '.js';
  script.onload = () => {
    console.log('%c[Debug] %cJavaScript file %c' + url[0] + '%c loaded', 'color: #0a0; font-weight: bold', 'color: #000', 'color: #00a; font-weight: bold', 'color: #000');
    require(url.splice(1));
  };
  document.head.appendChild(script);
}