Object.defineProperty(Object.prototype,'Enum', {
  value: function() {
    for(i in arguments) {
      Object.defineProperty(this,arguments[i], {
        value:parseInt(i),
        writable:false,
        enumerable:true,
        configurable:true
      });
    }
    return this;
  },
  writable:false,
  enumerable:false,
  configurable:false
}); 