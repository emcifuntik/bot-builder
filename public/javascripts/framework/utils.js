function randString() {
  return Math.round(Math.random()*100000000).toString(32) + Math.round(Math.random()*100000000).toString(32) + Math.round(Math.random()*100000000).toString(32);
}