/* 
  Notes:

  - Type LifepathID: A specific lifepath is identified by the setting name, lifepath name tuple. This identifier is stored as 
    an array of two elements.
*/

/**** IE Hacks ****/
if ( typeof console === "undefined"  )
{
  FakeConsole = function(){
    this.log = function log(s){ };
  }

  console = new FakeConsole();
}

if (!Object.keys) {
  Object.keys = function (obj) {
    var keys = [], k;
    for (k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        keys.push(k);
      }
    }
    return keys;
  };
}

/**** End IE Hacks ****/

/**** Utility ****/
function getOrDefault(obj, key, def, err){
  if (key in obj ){
    return obj[key];
  }
  else {
    if ( err ) 
      console.log(err);
    return def;
  }
}

function getAsNumOrDefault(obj, key, def, err){
  v = getOrDefault(obj, key, def, err);
  if ( isNaN(v) ){
    if ( err ) 
      console.log(err);
    return def;
  }
  else {
    return v;
  }
}

function listToStr(list){
  var s = "";

  for(var i = 0; i < list.length; i++){
    if ( i > 0 ) {
      s = s + ", " + list[i];
    }
    else {
      s = list[i];
    }
  }
  return s;
}

function hashValues(hash){
  var l = [];
  for(var key in hash){
    l.push(hash[key]);
  }
  return l;
}

function hashKeys(hash){
  var l = [];
  for(var key in hash){
    l.push(key);
  }
  return l;
}

function listToHash(list){
  var h = {};
  for(var i = 0; i < list.length; i++){
    h[list[i]] = true;
  }
  return h;
}

/*
  Divide amt into num buckets. If there are buckets that have a value one higher than others, those higher-valued buckets are
  at the beginning.
*/
function divideIntoBuckets(amt, num){
  var result = [];
  var base = Math.floor(amt / num);
  var rem = amt % num;

  for(var i = 0; i < num; i++){
    result[i] = base;
    if ( rem > 0 ){
      result[i]++;
      rem--;
    }
  }

  return result;
}

function endsWith(string, substring)
{
  var l = substring.length;
  return string.length >= l && string.substring(string.length-l) == substring;
}

function beginsWith(string, substring)
{
  var l = substring.length;
  return string.length >= l && string.substring(0, substring.length) == substring;
}

function capitalizeEachWord(string)
{
  return string.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

function getFrameByName(name) {
  for (var i = 0; i < frames.length; i++)
    if (frames[i].name == name)
      return frames[i];
        
  return null;
}

/**** End Utility ****/

