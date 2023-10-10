
/**** Class LifepathID ****/
function LifepathID(settingName, lifepathName)
{
  this.id = [settingName, lifepathName];
  this.hashKey = LifepathID_hashHey;
  return this;
}
// Return a string represending this lifepath that can be used as a key in a hash 
function LifepathID_hashHey(){
  return this.id[0] + ":" + this.id[1];
}
/**** End Class LifepathID ****/

/**** Class TimeRange ****/
function TimeRange(expression)
{
  this.defaultVal = 1;
  this.min = 1;
  this.max = 1;

  if( expression[0] != "+range" ){
    console.log("Error: Unknown lifepath time expression type " + expression[0]); 
    return;
  }

  this.min = parseInt(expression[1]);
  this.max = parseInt(expression[2]);
  this.defaultVal = this.min;
}
/**** End Class TimeRange ****/

/**** Class DisplayLifepath ****/
function DisplayLifepath(setting, name, jsonLifepath){
  this.setting = setting;
  this.name = name;
  this.displayName = getOrDefault(jsonLifepath, "display_name", name, null);

  this.timeRange = null;
  this.timeIsChoosable = false;
  if ( jsonLifepath.time == "*" ){
    if ( null == jsonLifepath.time_expr ){
      console.log("Error: Lifepath with variable time is missing time_expr attribute");
      this.time = 1;
    }
    else {
      this.timeRange = new TimeRange(jsonLifepath.time_expr);
      this.time = this.timeRange.defaultVal;
      this.timeIsChoosable = true;
    }
  }
  else {
    this.time = getAsNumOrDefault(jsonLifepath, "time", -1, "time field is not set in lifepath " + name + " or is not a number");
  }

  this.stat = getOrDefault(jsonLifepath, "stat", [], null);
  this.leads = getOrDefault(jsonLifepath, "leads", [], null);
  this.keyLeads = getOrDefault(jsonLifepath, "key_leads", [], null);
  this.restrict = jsonLifepath["restrict"];
  this.requires = jsonLifepath["requires"];
  this.note = jsonLifepath["note"];
  this.weaponOfChoice = null;
  
  this.resourcePtsIsCalculated = false;
  if ( jsonLifepath.res == "*" ){
    // Figure out the resource point calculation 
    var expr = jsonLifepath.res_expr
    if ( null == expr ){
      console.log("Error: Lifepath with calculated resources is missing res_expr attribute");
      this.resourcePts = -1;
    }
    else if( expr[0] == '+mult_time'){
      this.resourcePtsIsCalculated = true;
      var mult = parseInt(expr[1])
      this.innerCalculateResourcePoints = function(prevLifepath){
        this.resourcePts = this.time * mult;
      }
    }
    else if( expr[0] == '+mult_prev'){
      this.resourcePtsIsCalculated = true;
      var mult = expr[1]
      this.innerCalculateResourcePoints = function(prevLifepath){
        if(prevLifepath){
          this.resourcePts = Math.floor(prevLifepath.resourcePts * mult);
        }
        else {
          this.resourcePts = -1;
        }
      }
    }
    else {
      console.log("Unknown res_expr type " + expr[0]);
      this.resourcePts = -1;
    }
  }
  else {
    this.resourcePts = getAsNumOrDefault(jsonLifepath, "res", -1, "res field is not set in lifepath " + name + " or is not a number");
  }

  skills = jsonLifepath.skills
  this.lifepathSkillPts = 0;
  this.generalSkillPts = 0;
  this.skills = [];
  this.brutalLifeDOF = 0;
  this.brutalLifeTraitName = null;

  this.generalSkillPtsIsCalculated = false;
  if ( skills && skills.length > 0){
    for(var j = 0; j < skills.length; j++){
      var skillsCategory = skills[j];
    
      // Is this the General skills category?
      if( skillsCategory[1] == "General" ){
        if (skillsCategory[0] == '*') {
          var expr = jsonLifepath.skills_expr
          if ( null == expr ){
            console.log("Error: Lifepath with calculated general skillpoints is missing skills_expr attribute");
            this.generalSkillPts = -1;
          }
          else if( expr[0] == '+mult_time'){
            this.generalSkillPtsIsCalculated = true;
            // Need a new variable name for this since javascript variables
            // are scoped to the function, not to the block.
            var multGenSkill = parseInt(expr[1])
            this.innerCalculateGeneralSkillPoints = function(){
              this.generalSkillPts = this.time * multGenSkill;
            }
          }
          else {
            console.log("Unknown skills_expr type " + expr[0]);
            this.resourcePts = -1;
          }
        } else {
          this.generalSkillPts += skillsCategory[0];
        }
      }
      else {
        this.lifepathSkillPts += skillsCategory[0];
        this.skills = this.skills.concat(skillsCategory.slice(1));
      }
    }
  }

  traits = jsonLifepath.traits
  if ( traits && traits.length > 0){
    this.traitPts = traits[0];
    this.traits = traits.slice(1);
  }   
  else{
    this.traitPts = 0;
    this.traits = [];
  }   

  this.commonTraits = []
  if( jsonLifepath.common_traits){
    this.commonTraits = jsonLifepath.common_traits
  }

  this.displayLeads = function(){
    return listToStr(this.leads);
  }

  this.displaySkills = function(){
    s = "";
    if ( this.lifepathSkillPts > 0 ){
      s += this.lifepathSkillPts + " pts: " + listToStr(this.skills);
    }
    if ( this.generalSkillPts > 0 ){
      if ( s.length > 0 )
        s += "; ";
      s += this.generalSkillPts + " pts: General";
    }
    return s;
  }

  this.displayTraits = function(){
    var l = this.traits;
    if ( l.length == 0 )
      l = ['-'];
    return listToStr(l);
  }

  this.displayStat = function(){
    var l = this.stat;
    var s = "";
    for(var i = 0; i < l.length; i++){
      stat = l[i];

      if ( i > 0 ) {
        s += ", ";
      }

      if(stat[1] == 'p'){
        if (stat[0] >= 0)
          s += "+" 
        s += stat[0] + " P";
      }
      else if (stat[1] == 'm'){
        if (stat[0] >= 0)
          s += "+" 
        s += stat[0] + " M";
      }
      else if (stat[1] == 'pm' || stat[1] == 'mp'){
        if (stat[0] >= 0)
          s += "+" 
        s += stat[0] + " P/M";
      }
    }

    if (s.length == 0){
      s = "-";
    }

    return s;
  }

  this.calculateResourcePoints = function(prevLifepath){
    if(this.resourcePtsIsCalculated){
      this.innerCalculateResourcePoints(prevLifepath);
    }
  }

  this.calculateGeneralSkillPoints = function(){
    if(this.generalSkillPtsIsCalculated){
      this.innerCalculateGeneralSkillPoints();
    }
  }

  /* Modify the skill points, resource points, trait points, and stat points 
     on this object based on the diminishing returns rules and the previously taken lifepaths:

     - The second time a lifepath is taken .... if there is no second trait, subtract 1 from the trait points on the path. 
     - The third time he only receives half the skill and resource points but no trait or stat points.
     - The fourth time the character only earns half the resource points and nothing else except years.

    The passed 'selectedLifepaths' object should be the list of DisplayLifepaths BEFORE this lifepath is added.
  */
  this.modifyForDiminishingReturns = function(selectedLifepaths){  
    var times = 0;
    for(var i = 0; i < selectedLifepaths.length; i++){
      if (selectedLifepaths[i].displayName == this.displayName){
        times++;
      }
    }

    if( times == 1 ){
      // Second time
      if(this.traits.length < 2 && this.traitPts > 0){
        this.traitPts--;
      }
    }
    else if( times == 2 ){
      // Third time
      this.generalSkillPts = Math.floor(this.generalSkillPts/2);
      this.lifepathSkillPts = Math.floor(this.lifepathSkillPts/2);
      this.resourcePts = Math.floor(this.resourcePts/2);
      this.stat = [];
      this.traitPts = 0;
    }
    else if( times >= 3 ){
      // Fourth time
      this.generalSkillPts = 0;
      this.lifepathSkillPts = 0;
      this.resourcePts = Math.floor(this.resourcePts/2);
      this.stat = [];
      this.traitPts = 0;
    }
  }

  this.applyBrutalLife = function(selectedLifepaths){
    // Number of lifepaths taken including this one.
    var num = selectedLifepaths.length + 1;

    if ( num > 4 ){
      this.brutalLifeDOF = Math.floor(Math.random()*6+1);
      if (this.brutalLifeDOF == 1 || num > 9 && this.brutalLifeDOF == 2){
        switch(num){
          case 5:
            this.brutalLifeTraitName =  "Missing Digit";
            break;
          case 6:
            this.brutalLifeTraitName =  "Lame";
            break;
          case 7:
            this.brutalLifeTraitName =  "Missing Eye";
            break;
          case 8:
            this.brutalLifeTraitName =  "Missing Hand";
            break;
          case 9:
            this.brutalLifeTraitName =  "Missing Limb";
            break;
          default:
            this.brutalLifeTraitName =  "Missing Limb";
        }
      }
    }
  }

  this.replaceWeaponOfChoice = function() {
    if( this.weaponOfChoice ){
      replaceWeaponOfChoice(this, this.weaponOfChoice);
    }
  }

}

/**** End Class DisplayLifepath ****/

/**** Class StartingStatPoints ****/
function StartingStatPoints(startingStatPointsJson){
  this.startingStatPoints = startingStatPointsJson;

  // Returns mental, physical
  this.lookup = function(age){
    rc = [0,0];
    if (this.startingStatPoints){
      for(var i = 0; i < this.startingStatPoints.length; i++){
        var e = this.startingStatPoints[i]
        if ( e.range[0] <= age && e.range[1] >= age ){
          rc = [e.m, e.p];
          break;
        }
      }
    }
    return rc;
  }
}
/**** End Class StartingStatPoints ****/

/**** Class DisplayStat ****/
function DisplayStat(name){
  this.name = name;
  this.shade = "B";
  // Number of mental stat points spent on this stat.
  this.mentalPointsSpent = 0;
  // Number of physical stat points spent on this stat.
  this.physicalPointsSpent = 0;
  // Number of stat points that can be spent on either physical or mental that were spent on this stat.
  this.eitherPointsSpent = 0;
  this.bonus = 0;

  if ( name == "Will" || name == "Perception" )
    this.type = "m";
  else
    this.type = "p";

  this.exp = function(){
    var exp = this.mentalPointsSpent + this.physicalPointsSpent + this.eitherPointsSpent;
    if ( this.shade == 'G' ){
      // 5 of the summed points were used for shade shifting.
      exp -= 5;
    }

    exp += this.bonus;

    return exp;
  }

  this.specificPointsSpent = function(){
    if("m" == this.type){
      return this.mentalPointsSpent;
    }
    else {
      return this.physicalPointsSpent;
    }
  }

  this.setSpecificPointsSpent = function(v){
    if("m" == this.type){
      this.mentalPointsSpent = v;
    }
    else {
      this.physicalPointsSpent = v;
    }

  }
}
/**** End Class DisplayStat ****/

/**** Class DisplaySkill ****/
// skillsdata should be the JSON skills data from the server.
function DisplaySkill(name, skillsdata){
  this.name = name;

  this.roots = []
  this.stock = null;
  this.isMagic = false;

  var data = skillsdata[name];
  if ( ! data ) {

    // No defined data found. If this is a -wise, we know they are all rooted in perception.
    if( endsWith(name, "-wise") ){
      this.roots = ['Perception'];
    } 
    else {
      name = getGeneralSkillNameFor(name);
      var data = skillsdata[name];
      if ( ! data )
      {
        console.log("Error: couldn't load data about skill " + name);
      }
    }
  }

  if ( data )
  {
    this.roots = data.roots;
    if ( "stock" in data ){
      this.stock = data.stock;
    }

    this.isMagic = ("magic" in data);
  }
  
  // Is this a training skill (i.e. can't be advanced)?
  this.isTraining = name.toLowerCase().substring(name.length-"training".length) == "training";
  this.isTraining = this.isTraining || (data && ("training" in data));

  this.costToOpen = 1
  if( this.isMagic ){
    this.costToOpen = 2;
  }

  this.lifepathPointsSpent = 0;
  this.generalPointsSpent = 0;
  this.bonus = 0;
  this.roundUp = false;

  this.pointsSpent = function(){
    return this.lifepathPointsSpent + this.generalPointsSpent;
  }

  this.displayRoots = function(){
    var s = "";
    for(var i = 0; i < this.roots.length; i++){
      if ( i > 0 )
        s += "/";
      s += this.roots[i];
    }
    return s;
  }

  this.shade = function(statsByName){
    return computeStatAverage(statsByName, this.roots)[0];
  }

  this.exp = function(statsByName){
    var sum = this.lifepathPointsSpent + this.generalPointsSpent;
    if ( sum == 0 ){
      return 0;
    } else {
      var shadeAndExp = computeStatAverage(statsByName, this.roots);
  
      var round = Math.floor;
      if (this.roundUp) 
        round = Math.ceil

      return round(shadeAndExp[1]/2) + sum - this.costToOpen + this.bonus;
    }
  }

  this.notes = function(){
    if ( this.isMagic ){
      return "open-ended";
    }
    else {
      return "";
    }
  }

}
/**** End Class DisplaySkill ****/

/**** Class DisplayTrait ****/

// traitdata should be the JSON trait data from the server.
function DisplayTrait(name, traitdata){
  this.name = name;

  var data = traitdata[name];

  if ( ! data ){
    console.log("Error: undefined trait " + name + ". Treating as a character trait.");
    this.cost = 0;
    this.type = "character";
    //this.name += "*";
    this.stock = null;
    this.category = null;
    this.desc = null;
  }
  else {

    // If cost is 0, there is no cost; trait cannot be bought
    this.cost = data["cost"]
    this.type = data["type"]
    this.desc = data["desc"];
    this.bonus = data["bonus"];

    var rawRestrict = data["restrict"] 
    // Stock is one of mannish, dwarven, elven, orcish, trollish. If there is no restriction, it is set to null.
    this.stock = null;
    // Category is common, lifepath, or special
    this.category = null;

    if ( rawRestrict ){
      for(var i = 0; i < rawRestrict.length; i++){
        var flag = rawRestrict[i];
        if( flag == "common" || flag == "lifepath" || flag == "special"){
          if ( !this.category )
            this.category = [];
          this.category.push(flag);
        }
        else if ( flag == "mannish" || flag == "dwarven" || flag == "elven" || flag == "orcish" || flag == "trollish" ){
          if ( !this.stock )
            this.stock = [];
          this.stock.push(flag);
        }
      }
    }
  }

  this.typeForDisplay = function(){
    if(this.type == "character")
      return "character"
    else if (this.type == "call_on")
      return "call-on"
    else if (this.type == "die")
      return "die"
    else
      return "?"
  }

  this.nameForListDisplay = this.name + " ("+this.typeForDisplay()+", "+ this.cost + (this.cost == 1 ? "pt" : "pts") + ")";

}

/**** End Class DisplayTrait ****/

/**** Class DisplayRelationship ****/
function DisplayRelationship(desc, importance, isImmedFam, isOtherFam, isRomantic, isForbidden, isHateful){
  this.desc = desc;
  this.importance = importance;
  this.isImmedFam = isImmedFam;
  this.isOtherFam = isOtherFam;
  this.isRomantic = isRomantic;
  this.isForbidden = isForbidden;
  this.isHateful = isHateful;

  // Calculate cost of current relationship
  this.cost = 0;
  if (importance == "minor"){
    this.cost = 5;
  } else if (importance == "significant"){
    this.cost = 10;
  } else if (importance == "powerful"){
    this.cost = 15;
  }
  if ( isImmedFam )
    this.cost -= 2;
  if ( isOtherFam )
    this.cost -= 1;
  if ( isRomantic )
    this.cost -= 2;
  if ( isForbidden )
    this.cost -= 1;
  if ( isHateful )
    this.cost -= 2;

  if ( this.cost < 0 )
    this.cost = 0;

  this.forDisplay = function(){
    var s = this.desc;
    s += "; " + this.importance
    if( this.isImmedFam )
      s += ", immed. fam.";
    if( this.isOtherFam )
      s += ", family";
    if( this.isRomantic)
      s += ", romantic";
    if( this.isForbidden)
      s += ", forbidden";
    if( this.isHateful)
      s += ", hateful";
    return s;
  }
}
/**** End Class DisplayRelationship ****/

/**** Class DisplayGear ****/
function DisplayGear(desc, cost){
  this.desc = desc;
  this.cost = cost;

  this.forDisplay = function(){
    return this.desc;
  }
}
/**** End Class DisplayGear ****/

/**** Class DisplayAffiliation ****/
function DisplayAffiliation(desc, importance){
  this.desc = desc;
  this.importance = importance;

  // Calculate cost of current relationship
  this.cost = 0;
  this.dice = 0;
  if (importance == "small"){
    this.cost = 10;
    this.dice = 1;
  } else if (importance == "large"){
    this.cost = 25;
    this.dice = 2;
  } else if (importance == "national"){
    this.cost = 50;
    this.dice = 3;
  }

  this.forDisplay = function(){
    var s = this.desc;
    s += "; " + this.importance
    return s;
  }
}
/**** End Class DisplayAffiliation ****/

/**** Class DisplayReputation ****/
function DisplayReputation (desc, importance){
  this.desc = desc;
  this.importance = importance;

  // Calculate cost of current relationship
  this.cost = 0;
  this.dice = 0;
  if (importance == "local"){
    this.cost = 7;
    this.dice = 1;
  } else if (importance == "regional"){
    this.cost = 25;
    this.dice = 2;
  } else if (importance == "national"){
    this.cost = 45;
    this.dice = 3;
  }

  this.forDisplay = function(){
    var s = this.desc;
    s += "; " + this.importance
    return s;
  }
}
/**** End Class DisplayReputation ****/

/**** Class Alert ****/
function Alert(desc, type){
  this.desc = desc;
  if(type != 'warn' && type != 'succ'){
    console.log("Alert constructor: unknown type " + type);
    type = 'warn';
  }

  this.type = type;
}
/**** End Class Alert ****/

/**** Class PTGS ****/
function PTGS() {
  this.su = {"shade" : "B", "exp" : 0}
  this.li = {"shade" : "B", "exp" : 0}
  this.mi = {"shade" : "B", "exp" : 0}
  this.se = {"shade" : "B", "exp" : 0}
  this.tr = {"shade" : "B", "exp" : 0}
  this.mo = {"shade" : "B", "exp" : 0}

  this.calculate = function(forte, mortal) {
    this.su.exp = Math.floor(forte/2)+1
	this.mo=mortal
	
	
    /* Put Light, Midi, Severe, and Traumatic as far right as possible, then
     * move them backwards to satisfy the constraint that they may only be 
     * as far apart as half forte rounded up.
     */

	if (this.mo.shade == "B")
		mo_as_B=this.mo.exp
	else
		mo_as_B=this.mo.exp+16
	
    gap = Math.ceil(forte/2)

    var tol = [mo_as_B-4,mo_as_B-3,mo_as_B-2, mo_as_B-1]
    for(i = 0; i < 4; i++) {
      last = this.su.exp
      if (i > 0) 
        last = tol[i-1];

      if (tol[i] - last > gap)
        tol[i] = last+gap

      if (tol[i] < this.su.exp)
        tol[i] = this.su.exp;
    }
    
    this.li.exp = tol[0]
    this.mi.exp = tol[1]
    this.se.exp = tol[2]
    this.tr.exp = tol[3]
    // Graying as needed (it is not possible to make charecters with Gray Midi)
    if (this.se.exp >= 17) {
		this.se.shade="G";
		this.se.exp-= 16;
	}
	else
		this.se.shade="B";
    
    if (this.tr.exp >= 17) {
		this.tr.shade="G";
		this.tr.exp-= 16;
	}
	else
		this.tr.shade="B";
  }
}
/**** End PTGS ****/

/**** Class TraitBonus ****/
// Bonuses for a single trait
function TraitBonus(traitName, traitExpr) {
  this.traitName = traitName;
  this.traitExpr = traitExpr;

  this.shadeBonusForSkill = {};
  this.shadeBonusForAttr = {};
  this.addBonusForStat = {};
  this.addBonusForAttr = {};
  this.addBonusForSkill = {};
  this.addBonusForStatPool = {};
  this.addBonusForReputation = {};
  this.setBonusForStatMax = {};
  this.setBonusForAttrMax = {};
  this.addBonusForStatMax = {};
  this.addBonusForAttrMax = {};

  this.roundingBonusForSkillsWithAnyRootIn = {};
  this.roundingBonusForSkillsWithAllRootsIn = {};
  this.roundingBonusForSkill = function(displaySkill) {
    var bonus = false;
    
    for(var i = 0; i < displaySkill.roots.length; i++) {
      var root = displaySkill.roots[i];
      var b = this.roundingBonusForSkillsWithAnyRootIn[root];
      if (b) {
        bonus = true;
        break;
      }
    }

    if (bonus) 
      return true;

    // If there is no criteria for roundingBonusForSkillsWithAllRootsIn, fail
    if (hashValues(this.roundingBonusForSkillsWithAllRootsIn).length == 0) 
      return false;

    bonus = true;
    for (var key in this.roundingBonusForSkillsWithAllRootsIn) {
      var hasRoot = false;
      for(var i = 0; i < displaySkill.roots.length; i++) {
        var root = displaySkill.roots[i];
        if (root == key) {
          hasRoot = true;
          break;
        }
      }

      if (!hasRoot) {
        bonus = false;
        break;
      }
    }

    return bonus;
  }

  // Parse the trait expression. It has the form:
  /*
  [
    {
      target: [+skills, +choose],
      value: [+add, 2]
    },
    {
      target: [+total_physical, +choose],
      value: [+add, 1]
    }
  ] 
  */

  this.parseStatOrAttrBonus = function(target, value){
    var type = target[0];
    target = target.slice(1);
    for(var i = 0; i < target.length; i++){
      target[i] = capitalizeEachWord(target[i]);
      if (value[0] == '+add') {
        // [+add, 1]
        if (type == '+stat') {
          this.addBonusForStat[target[i]] = value[1];
        } else {
          this.addBonusForAttr[target[i]] = value[1];
        }
      } else {
        console.log("TraitBonus.parseStatOrAttrBonus: unknown value operation ", value[0]);
      }
    }
  }

  this.parseTotalPoolBonus = function(target, value) {
    this.addBonusForStatPool[target[1]] = value[1];
  }

  this.parseStatOrAttrMaxBonus = function(target, value){
    var type = target[0];
    target = target.slice(1);
    for(var i = 0; i < target.length; i++){
      target[i] = capitalizeEachWord(target[i]);
      if (value[0] == '+add') {
        // [+add, 1]
        if (type == '+stat') {
          this.addBonusForStatMax[target[i]] = value[1];
        } else {
          this.addBonusForAttrMax[target[i]] = value[1];
        }
      } else if (value[0] == '+set') {
        // [+set, 1]
        if (type == '+stat') {
          this.setBonusForStatMax[target[i]] = value[1];
        } else {
          this.setBonusForAttrMax[target[i]] = value[1];
        }
      } else {
        console.log("TraitBonus.parseStatOrAttrMaxBonus: unknown value operation ", value[0]);
      }
    }
  }

  this.parseSkillsBonus = function(target, value){
    var type = target[0];
    target = target.slice(1);
    for(var i = 0; i < target.length; i++){
      target[i] = capitalizeEachWord(target[i]);
      if (value[0] == '+add') {
        // [+add, 1]
        this.addBonusForSkill[target[i]] = value[1];
      } else {
        console.log("TraitBonus.parseSkillsBonus: unknown value operation ", value[0]);
      }
    }
  }

  this.parseSkillsHavingBonus = function(target, value){
    var type = target[0];
    var anyOrAll = target[1];
    target = target.slice(2);

    for(var i = 0; i < target.length; i++){
      target[i] = capitalizeEachWord(target[i]);
      if (value[0] == '+round_up') {
        // [+round_up]

        if (anyOrAll == '+any_root') {
          this.roundingBonusForSkillsWithAnyRootIn[target[i]] = true;
        } else {
          this.roundingBonusForSkillsWithAllRootsIn[target[i]] = true;
        }
      } else {
        console.log("TraitBonus.parseSkillsHavingBonus: unknown value operation ", value[0]);
      }
    }
  }

  if (this.traitExpr == null) {
    // No bonuses on this trait
    return;
  }

  for(var i = 0; i < traitExpr.length; i++){
    target = traitExpr[i].target;
    value = traitExpr[i].value;

    if (target[0] == '+stat' || target[0] == '+attr') {
      this.parseStatOrAttrBonus(target, value);
    } else if (target[0] == '+pool') {
      this.parseTotalPoolBonus(target, value);
    } else if (target[0] == '+stat_max' || target[0] == '+attr_max') {
      this.parseStatOrAttrMaxBonus(target, value);
    } else if (target[0] == '+skills') {
      this.parseSkillsBonus(target, value);
    } else if (target[0] == '+skills_having') {
      this.parseSkillsHavingBonus(target, value);
    } else {
      console.log("TraitBonus: unknown expression type ", target);
    }
  }
  
  
}
/**** End TraitBonus ****/

/**** Class TraitBonuses ****/
// Aggregates together the bonuses for all traits.
function TraitBonuses() {
  this.traits = {};

  // Add a trait who's bonuses we want to later be able to lookup.
  this.addTrait = function(trait, traitExpr) {
    this.traits[trait] = new TraitBonus(trait, traitExpr.bonus);
  }

  this.delTrait = function(trait) {
    delete this.traits[trait];
  }

  this.getAddBonusesFor = function(what, key) {
    var bonus = 0;
    for (var traitName in this.traits) {
      traitBonus = this.traits[traitName];
      var v = 0
      if (what == "stat") {
        v = getOrDefault(traitBonus.addBonusForStat, key, 0, null); 
      } else if (what == "attr") {
        v = getOrDefault(traitBonus.addBonusForAttr, key, 0, null); 
      } else if (what == "skill") {
        v = getOrDefault(traitBonus.addBonusForSkill, key, 0, null); 
      } else if (what == "statmax") {
        v = getOrDefault(traitBonus.addBonusForStatMax, key, 0, null); 
      } else if (what == "attrmax") {
        v = getOrDefault(traitBonus.addBonusForAttrMax, key, 0, null); 
      } else if (what == "pool") {
        v = getOrDefault(traitBonus.addBonusForStatPool, key, 0, null); 
      }

      bonus += v
    }
    return bonus;
  }

  this.getSetBonusesFor = function(what, key) {
    var bonus = -1;
    for (var traitName in this.traits) {
      traitBonus = this.traits[traitName];
      var v = 0
      if (what == "statmax") {
        v = getOrDefault(traitBonus.setBonusForStatMax, key, -1, null); 
      } else if (what == "attrmax") {
        v = getOrDefault(traitBonus.setBonusForAttrMax, key, -1, null); 
      }

      // Of all the bonuses that try to set this stat/attr max, 
      // take the minimum.
      if (v > -1) {
        if (bonus == -1 || bonus > v) {
          bonus = v
        }
      }
    }
    return bonus;
  }

  this.getAddBonusesForStat = function(stat) {
    return this.getAddBonusesFor("stat", stat);
  }

  this.getAddBonusesForAttr = function(attr) {
    return this.getAddBonusesFor("attr", attr);
  }

  this.getAddBonusesForSkill = function(skill) {
    return this.getAddBonusesFor("skill", skill);
  }

  this.getAddBonusesForAttrMax = function(attr) {
    return this.getAddBonusesFor("attrmax", attr);
  }

  this.getAddBonusesForStatMax = function(stat) {
    return this.getAddBonusesFor("statmax", stat);
  }

  // catg should be 'physical' or 'mental'
  this.getAddBonusesForStatPool = function(catg) {
    return this.getAddBonusesFor("pool", catg);
  }

  // If there is a bonus that sets the max value of the attribute,
  // return the value it should be set to. Otherwise, return -1.
  this.getSetBonusesForAttrMax = function(attr) {
    return this.getSetBonusesFor("attrmax", attr);
  }

  // If there is a bonus that sets the max value of the stat,
  // return the value it should be set to. Otherwise, return -1.
  this.getSetBonusesForStatMax = function(stat) {
    return this.getSetBonusesFor("statmax", stat);
  }

  this.getRoundUpBonusForSkill = function(displaySkill) {
    for (var traitName in this.traits) {
      traitBonus = this.traits[traitName];

      if (traitBonus.roundingBonusForSkill(displaySkill)) {
        return true;
      }
    }
    return false;
  }

/*  
  // Returns the type of choice needed if a trait needs the user to 
  // choose a Stat, Skill, Reputation, etc. 
  this.choiceNeeded(trait_expr)

  // Return any 'shift to X' bonuses for the named skill.
  // Returns the shade to shift to.
  this.getShadeBonusesForSkill(skill)
  this.getShadeBonusesForAttr(attr)

  this.getAddBonusesForReputation(reputationName)

*/
  // See function areLifepathRequirementsSatisfied($scope, rexpr){
}

/**** End TraitBonuses ****/

