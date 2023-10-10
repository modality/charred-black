
/**
This is the version of the serialized character structure used by convertCurrentCharacterToStruct
and loadCurrentCharacterFromStruct.
TODO: the appropriate weapons choices need to be saved with the character!
*/
var serializeVersion = 1;

function handleIframeLoad(frameName)
{
  var frame = getFrameByName(frameName);
  if ( frame != null )
  {
    result = frame.document.getElementsByTagName("pre")[0].innerHTML;
 
    // The form's onload handler gets called when the main page is first loaded as well.
    // We detect this condition by checking if the iframes contents are not empty.
    if ( result.length > 0 ){
      // At this point we've uploaded a character data file and the server has sent the response (being the JSON-encoded character data)
      // into the file upload iframe. We need to get the BurningCtrl $scope and call loadCurrentCharacterFromStruct with the data.
      var scope = angular.element($("#accordion_main")).scope();
      try{
        var charStruct = angular.fromJson(result);
        if( ! characterStructValid(charStruct) ){
          scope.$apply(
            function(){
              scope.addAlert('tools', "That is not a valid character file.");
          });
        }
        scope.$apply(
          function(){
            scope.loadCurrentCharacterFromStruct(charStruct);
          }
        );
      } 
      catch(e){
        console.log("Loading character failed: " + e);
        scope.$apply(
          function(){
            scope.addAlert('tools', "That is not a valid character file.");
        });
      }
    }
  }
}

/**** Angular ****/

var burningModule = angular.module('burning',['ngRoute', 'ui.bootstrap']);

// Define the settings service
burningModule.service('settings', Settings);
burningModule.service('appropriateWeapons', AppropriateWeaponsService);
burningModule.service('characterStorage', CharacterStorageService);
burningModule.service('burningData', BurningDataService);
burningModule.service('weaponOfChoice', WeaponOfChoiceService);

/* Set up URL routes. Different URLs map to different HTML fragments (templates)*/
burningModule.config(function($routeProvider) {
  $routeProvider.
    when('/', {controller: BurningCtrl, templateUrl:'/main_partial'}).
    when('/config', {controller: ConfigCtrl, templateUrl:'/config_partial'}).
    when('/help', {controller: ConfigCtrl, templateUrl:'/help_partial'}).
    otherwise({redirectTo:'/'});
});

/* On the help page we need to use in-page links for the table of contents.
  To make this work with Angular we need the following (see http://stackoverflow.com/questions/14712223/how-to-handle-anchor-hash-linking-in-angularjs)
*/
burningModule.run(function($rootScope, $location, $anchorScroll, $routeParams) {
  //when the route is changed scroll to the proper element.
  $rootScope.$on('$routeChangeSuccess', function(newRoute, oldRoute) {
    if($routeParams.scrollTo){
      $location.hash($routeParams.scrollTo);
      $anchorScroll();  
    }
  });
});

function BurningCtrl($scope, $http, $modal, $timeout, settings, appropriateWeapons, weaponOfChoice, characterStorage, burningData){

  $scope.basicAttributeNames =  ["Mortal Wound", "Reflexes", "Health", "Steel", "Hesitation", "Stride", "Circles", "Resources"];

  /**
    This function is used when calculating the hierarchical select lists of gear or property
    to display to the user.

    Parameters:
      listForSelect: two-dimensional array, where the first index picks the level in the hierarchy,
        and the second index is an item in that level of the hierarchy.
      currentItem: An array indexed by level in the hierarchy, whos value is the currently
        selected item at that level.
      index: The starting level in the hierarchy for which we should recalculate the lower levels
        of the lists.
  */ 
  $scope.calculateHierarchyListForSelectN = function(listForSelect, currentItem, index){
    if(index < 1)
      return;

    while(index < 3){

      if(!currentItem[index-1] || !currentItem[index-1].resources) {
        listForSelect[index] = []; 
        currentItem[index] = {};
      }
      else {
        listForSelect[index] = currentItem[index-1].resources;
        currentItem[index] = listForSelect[index][0];
      }

      index++;
    }
  }

  // Initialize the controller variables to the default empty state, except for the passed parameters which override defaults.
  $scope.initialize = function(stock){
    $scope.enforceLifepathReqts = settings.enforceLifepathReqts
    $scope.enforcePointLimits = settings.enforcePointLimits

    /* A list of DisplayLifepath. */
    $scope.selectedLifepaths = []; 

    $scope.statNames = ["Will", "Perception", "Power", "Forte", "Agility", "Speed"];
    $scope.stats = [];
    $scope.statsByName = {};
    // Skill exponent calculations require all the stats, and the Hatred attribute.
    $scope.statsForSkillCalc = {};
    for(var i = 0; i < $scope.statNames.length; i++){
      var n = $scope.statNames[i];
      var stat = new DisplayStat(n);
      $scope.stats.push(stat);
      $scope.statsByName[n] = stat;
      $scope.statsForSkillCalc[n] = stat;
    }
    $scope.statsForSkillCalc["Hatred"] = {
      "exp": function(){
        // Note: this function can't be called until $scope.attribute is defined!
        return $scope.attribute("Hatred").exp;
      },
      "calcshade": function(){
        return $scope.attribute("Hatred").shade;
      }
    };
    $scope.statsForSkillCalc["Ancestral Taint"] = {
      "exp": function(){
        // Note: this function can't be called until $scope.attribute is defined!
        return $scope.attribute("Ancestral Taint").exp;
      },
      "calcshade": function(){
        return $scope.attribute("Ancestral Taint").shade;
      }
    };
    $scope.statsForSkillCalc["Spite"] = {
      "exp": function(){
        // Note: this function can't be called until $scope.attribute is defined!
        return $scope.attribute("Spite").exp;
      },
      "calcshade": function(){
        return $scope.attribute("Spite").shade;
      }
    };
    // Setting names for use in the Add Lifepath section
    $scope.settingNames  = ["Loading..."]
    $scope.currentSettingLifepathNames  = [];
    // The currently selected lifepath
    $scope.currentSettingLifepath = "Loading...";

    $scope.currentRelationshipDesc = "";
    $scope.currentRelationshipImportance = "minor";
    $scope.currentRelationshipIsImmedFam = false;
    $scope.currentRelationshipIsOtherFam = false;
    $scope.currentRelationshipIsRomantic = false;
    $scope.currentRelationshipIsForbidden = false;
    $scope.currentRelationshipIsHateful = false;

    $scope.relationships = {};

    $scope.currentGearDesc = "";
    $scope.currentGearCost = "";

    $scope.gear = {};

    $scope.currentPropertyDesc = "";
    $scope.currentPropertyCost = "";

    $scope.property = {};

    $scope.currentAffiliationDesc = "";
    $scope.currentAffiliationImportance = "small";

    $scope.affiliations = {};

    $scope.currentReputationDesc = "";
    $scope.currentReputationImportance = "local";

    $scope.reputations = {};

    // Hash containing total stat points categorized by 
    // type (physical, mental, either)
    $scope.totalStatPoints = {"physical" : 0, "mental" : 0, "either" : 0}
    $scope.unspentStatPoints = {"physical" : 0, "mental" : 0, "either" : 0}

    $scope.totalSkillPoints = {"lifepath" : 0, "general" : 0}
    $scope.unspentSkillPoints = {"lifepath" : 0, "general" : 0}

    // Character name
    $scope.name = "";

    // Character stock. One of man, dwarf, orc, elf
    if ( ! isValidStock(stock) ){
      console.log("Invalid stock '"+stock+"' passed to BurningCtrl.initialize. Defaulting to man");
      stock = "man";
    }

    $scope.stock = stock;

    // Character id (server side id)
    $scope.charid = null;

    // Character age
    $scope.age = 0;

    // Character gender
    $scope.gender = "female";

    /* Currently seleted setting in the add-lifepath section */
    $scope.currentSetting = "(Select Setting)";

    /* Custom wise that the user has currently entered. */
    $scope.customWiseName = "";

    /* Skills that character earned from lifepaths */
    $scope.lifepathSkills = {};

    /* Skills that character added that use general skill points */
    $scope.generalSkills = {};

    /* Traits that the character has chosen */
    $scope.purchasedTraits = {};

    /* Traits that are required from lifepaths */
    $scope.requiredTraits = {};

    /* Stock common traits */
    $scope.commonTraits = {};

    /* Traits that are on the character's lifepaths, but not necessarily taken */
    $scope.lifepathTraits = {};

    /* Modifiers to attributes based on the answers to questions. This applies to Greed, Steel, etc. 
       The hash is keyed by attribute name, and the value is a list of yes/no questions, their answers,
       and the modifier applied for a yes answer.
    */
    $scope.attributeModifierQuestionResults = {};

    $scope.attributeBonuses = {};

    /* Used to keep track of whether the user shade-shifted an attribute, for those attributes that 
       allow shade shifting */
    $scope.attributeShade = {'Steel': 'B', 'Grief' : 'B', 'Greed' : 'B', 'Hatred' : 'B', 'Spite' : 'B'};

    $scope.ptgs = new PTGS(); 

    /* List of traits to show in the Choose Special Trait dropdown */
    $scope.specialTraitsForDisplay = [];

    $scope.totalTraitPoints = 0;
    $scope.unspentTraitPoints = 0;

    $scope.totalResourcePoints = 0;
    $scope.unspentResourcePoints = 0;

    $scope.currentGeneralSkill = "Loading....";

    $scope.currentLifepathTrait = "Loading....";

    $scope.currentSpecialTrait = "Loading...";

    // Messages that warn the character of traits they must take to satisfy lifepath requirements
    $scope.lifepathTraitWarnings = [];

    // Warnings shown when there is an error saving character or creating character sheet.
    $scope.alerts = {
      'tools' : {},
      'resources' : {},
      'trait' : {}
    };

    $scope.characterStorage = characterStorage
    
    $scope.resourceAdderToShow = 'gear';
 
    // If this is true, then the user had added a lifepath to an Orc character that added a 
    // brutal life trait, and then the character removed that lifepath. According to the rules
    // they can never gain more lifepaths after this action.
    $scope.brutalLifeWithdrawn = false;

    calculateGearSelectionLists($scope, burningData);
    calculatePropertySelectionLists($scope, burningData);
   
    $scope.serverSettings = serverSettings;
  
  }

  $scope.initialize("man");

  if ( characterStorage.currentCharacter ){
    //console.log("Loading current character");
    loadCurrentCharacterFromStruct($scope, characterStorage.currentCharacter, burningData, appropriateWeapons);
  }

  $scope.hashValues = hashValues;

  $scope.generateName = function(){

    $http.get("/namegen/" + $scope.gender, {'timeout': 3000} ).
      success(function(data,status,headers,config){
        $scope.name = data;
      }).
      error(function(data,status,headers,config){
        console.log("Error: generating name failed: " + data);
      });
  }

  if ( $scope.name.length == 0 ){
    $scope.generateName();
  }

  $scope.hasTrait = function(traitName){
    return (traitName in $scope.commonTraits) || (traitName in $scope.purchasedTraits) || (traitName in $scope.requiredTraits);
  }


  $scope.attributeNames = function(){
    var result = $scope.basicAttributeNames.slice();
    if ( $scope.stock == "orc" ){
      result.push("Hatred");
    }
    else if ( $scope.stock == "elf" ){
      result.push("Grief");
      // Spite must be calculated after Grief
      if ( $scope.hasTrait("Spite") ) {
        result.push("Spite");
      }
    }
    else if ( $scope.stock == "dwarf" ){
      result.push("Greed");
    }
    else if ( ($scope.stock == "man" || $scope.stock == "roden") && $scope.hasTrait("Faithful") ){
      result.push("Faith");
    }
    else if ( $scope.stock == "wolf" && $scope.hasTrait("Chosen Wolf") ){
      result.push("Ancestral Taint");
    }
    return result;
  }
    

  $scope.onGenderChange = function(){
    if ($scope.name.length == 0) {
      $scope.generateName();
    }
    calculateCurrentSettingLifepathNames($scope, burningData);
  }

  $scope.onStockChange = function(){
    var oldName = $scope.name;

    // Make a blank character sheet
    $scope.initialize($scope.stock);

    if ( oldName.length == 0 ){
      $scope.generateName();
    } else {
      $scope.name = oldName;
    }

    calculateSettingNames($scope, burningData);
    calculateCurrentSettingLifepathNames($scope, burningData);
    calculateSpecialTraitsForDisplay($scope, burningData);
  }

  $scope.onSettingChange = function(){

    calculateCurrentSettingLifepathNames($scope, burningData);
  }

  $scope.calculateAge = function(){
    calculateAge($scope);
  }

  $scope.onLifepathTimeChange = function(lp){
    calculateAge($scope);
    lp.calculateResourcePoints(null);
    calculateTotalResourcePoints($scope);
    calculateUnspentResourcePoints($scope);

    lp.calculateGeneralSkillPoints();
    calculateTotalSkillPoints($scope);
    openRequiredSkills($scope);
    calculateUnspentSkillPoints($scope);
    removeLifepathSkillsFromGeneralSkills($scope);
    calculateUnspentSkillPoints($scope);
  }

  burningData.registerOnAllDatasetsLoaded(function(){
    onLifepathsLoad($scope, burningData);
  });

  $scope.$on('$locationChangeStart', function(event, nextUrl, currentUrl) {
    var changingToMe = nextUrl.substring(nextUrl.length-3) == "/#/";
    var changingFromMe = currentUrl.substring(currentUrl.length-3) == "/#/";
    // Ignore self transitions
    if( changingToMe && changingFromMe ){
      changingToMe = false;
      changingFromMe = false;
    }

    if ( changingFromMe ){
      //console.log("Storing current character");
      characterStorage.currentCharacter = $scope.convertCurrentCharacterToStruct();
    }

  });

  $scope.onAddLifepathClick = function(){
    // Find the current lifepath info in the lifepaths
    var setting = burningData.lifepaths[$scope.stock][$scope.currentSetting];
    if (!setting) 
      return;

    var lifepath = setting[$scope.currentSettingLifepath];
    if (!lifepath) 
      return;

    displayLp = new DisplayLifepath($scope.currentSetting, $scope.currentSettingLifepath, lifepath);

    // If this lifepath has a negative 'either' stat bonus ask the user to apply it.
    var penalty = 0;
    for(var i = 0; i < displayLp.stat.length; i++){
      var stat = displayLp.stat[i];
      if (stat[1] == 'pm' || stat[1] == 'mp') {
        if (stat[0] < 0){
          penalty += stat[0];
        }
      }
    }
    if (penalty < 0) {
      $scope.chooseStatPenalties(displayLp, -penalty);
    }

    // If the lifepath contains 'Appropriate Weapons', ask the 
    // user to choose those weapons.
    if( appropriateWeapons.hasAppropriateWeapons(displayLp) ){
      var appropriate = appropriateWeapons.appropriateWeapons[displayLp.name];
      if ( ! appropriate ){
        // The selectAppropriateWeapons call will replace the appropriate weapons skill
        // with what is selected. It will also call the passed function on successful selection.
        appropriateWeapons.selectAppropriateWeapons(displayLp, function(){
          $scope.addDisplayLifepath(displayLp);
        });
        return;
      }
      else {
        appropriateWeapons.replaceAppropriateWeapons(displayLp, appropriate);
      }
    }

    // If the lifepath contains 'Weapon Of Choice', ask the 
    // user to choose the weapon.
    if( weaponOfChoice.hasWeaponOfChoice(displayLp) ){
      weaponOfChoice.selectWeaponOfChoice(displayLp, function(){
        $scope.addDisplayLifepath(displayLp);
      });
      return;
    }

    $scope.addDisplayLifepath(displayLp);

  }

  // Add a DisplayLifepath to the list of selected lifepaths for the character.
  $scope.addDisplayLifepath = function(displayLp){
    var prevLifepath = null;
    if($scope.selectedLifepaths.length > 0)
      prevLifepath = $scope.selectedLifepaths[$scope.selectedLifepaths.length-1];
    displayLp.calculateResourcePoints(prevLifepath);
    displayLp.calculateGeneralSkillPoints(prevLifepath);

    displayLp.modifyForDiminishingReturns($scope.selectedLifepaths);  
    if($scope.stock == "orc"){
      displayLp.applyBrutalLife($scope.selectedLifepaths);
    }
    $scope.selectedLifepaths.push(displayLp);
    calculateAge($scope);
    calculateTotalStatPoints($scope, burningData);
    calculateUnspentStatPoints($scope);
    calculateLifepathSkills($scope, burningData, appropriateWeapons);
    calculateTotalSkillPoints($scope);
    openRequiredSkills($scope);
    calculateUnspentSkillPoints($scope);
    removeLifepathSkillsFromGeneralSkills($scope);
    calculateUnspentSkillPoints($scope);
    calculateSettingNames($scope, burningData);
    calculateCurrentSettingLifepathNames($scope, burningData);
    calculateLifepathTraits($scope, burningData);
    setCommonTraits($scope, burningData);
    purchaseRequiredTraits($scope, burningData);
    calculateUnspentTraitPoints($scope);
    addBrutalLifeRequiredTraits($scope, burningData);
    calculateTraitWarnings($scope, burningData);
    calculateTotalResourcePoints($scope);
    calculateUnspentResourcePoints($scope);
    applyBonusesFromTraits($scope);
  }

  $scope.onRemoveLifepathClick = function(dlp){
    // Remove this dlp. Remove the last one if there are multiple.
    var index = -1;
    for(var i = $scope.selectedLifepaths.length-1; i >= 0; i--) {
      if ( $scope.selectedLifepaths[i].name == dlp.name ){
        index = i;
        break;
      }
    }

    // If this lifepath had a Brutal Life trait (DoF was 1) then this character can never take new lifepaths if
    // this one is removed.
    if ( dlp.brutalLifeTraitName ){
      $scope.brutalLifeWithdrawn = true;
    }

    $scope.selectedLifepaths.splice(index,1);
    calculateAge($scope);
    calculateTotalStatPoints($scope, burningData);
    calculateUnspentStatPoints($scope);
    calculateLifepathSkills($scope, burningData, appropriateWeapons);
    calculateTotalSkillPoints($scope);
    openRequiredSkills($scope);
    calculateUnspentSkillPoints($scope);
    correctStatPoints($scope);
    calculateSettingNames($scope, burningData);
    calculateCurrentSettingLifepathNames($scope, burningData);
    calculateLifepathTraits($scope, burningData);
    setCommonTraits($scope, burningData);
    purchaseRequiredTraits($scope, burningData);
    calculateUnspentTraitPoints($scope);
    addBrutalLifeRequiredTraits($scope, burningData);
    calculateTraitWarnings($scope, burningData);
    calculateTotalResourcePoints($scope);
    calculateUnspentResourcePoints($scope);
    applyBonusesFromTraits($scope);
  }
  
  $scope.incrementStat = function(stat){

    // Man stock has max 8 pts in any stat
    if ( $scope.stock == "troll" && (stat.name == "Power" || stat.name == "Forte" ) ) {
      if ( stat.exp() == 9 )
        return;
    } else {
      if ( stat.exp() == 8 )
        return;
    }

    var specificStatPoints = 0;
    var eitherStatPoints = $scope.unspentStatPoints.either;
    if("m" == stat.type){
      specificStatPoints = $scope.unspentStatPoints.mental;
    }
    else if ("p" == stat.type){
      specificStatPoints = $scope.unspentStatPoints.physical;
    }
    else{
      console.log("Error: Unknown stat type " + stat.type + " passed to incrementStat for stat " + stat.name);
      return;
    }

    if(specificStatPoints <= 0 && eitherStatPoints <= 0 && $scope.enforcePointLimits)
      return;
    
    if(specificStatPoints > 0){
      specificStatPoints -= 1;
      stat.setSpecificPointsSpent(stat.specificPointsSpent() + 1);
    }
    else {
      eitherStatPoints -= 1;
      stat.eitherPointsSpent += 1;
    }

    $scope.unspentStatPoints.either = eitherStatPoints;
    if("m" == stat.type){
      $scope.unspentStatPoints.mental = specificStatPoints;
    } 
    else if ("p" == stat.type){
      $scope.unspentStatPoints.physical = specificStatPoints;
    } 

    calculatePTGS($scope);
  }

  $scope.decrementStat = function(stat){

    if(stat.exp() <= 0)
      return;

    // First put back any 'either' category stat points, then the specific stat points.
    if ( stat.eitherPointsSpent > 0 ){
      stat.eitherPointsSpent -= 1;
      $scope.unspentStatPoints.either += 1;
    }
    else {
      var specificStatPoints = 0;
      
      stat.setSpecificPointsSpent(stat.specificPointsSpent() - 1);

      if("m" == stat.type){
        $scope.unspentStatPoints.mental += 1;
      } 
      else if ("p" == stat.type){
        $scope.unspentStatPoints.physical += 1;
      } 
      else{
        console.log("Error: Unknown stat type " + stat.type + " passed to decrementStat for stat " + stat.name);
        // Undo the decrement
        stat.setSpecificPointsSpent(stat.specificPointsSpent() + 1);
        return;
      }
    }

    calculatePTGS($scope);
  }

  $scope.changeStatShade = function(stat){
    // This method toggles between Gray and Black shades.

    var toGray = function(stat) {
      var specificStatPoints = 0;
      var eitherStatPoints = $scope.unspentStatPoints.either;
      if("m" == stat.type){
        specificStatPoints = $scope.unspentStatPoints.mental;
      }
      else if ("p" == stat.type){
        specificStatPoints = $scope.unspentStatPoints.physical;
      }
      else{
        console.log("Error: Unknown stat type " + stat.type + " passed to incrementStat for stat " + stat.name);
        return;
      }

      var cost = 5;

      if( specificStatPoints + eitherStatPoints < cost ){
        return;
      }

      if( specificStatPoints >= cost){
        specificStatPoints -= cost;
        stat.setSpecificPointsSpent(stat.specificPointsSpent() + cost);
        cost = 0;
      }
      else{
        stat.setSpecificPointsSpent(stat.specificPointsSpent() + specificStatPoints);
        cost = cost - specificStatPoints;
        specificStatPoints = 0;
      }

      eitherStatPoints -= cost;
      stat.eitherPointsSpent += cost;

      stat.shade = "G";
      $scope.unspentStatPoints.either = eitherStatPoints;
      if("m" == stat.type){
        $scope.unspentStatPoints.mental = specificStatPoints;
      } 
      else if ("p" == stat.type){
        $scope.unspentStatPoints.physical = specificStatPoints;
      } 
    }

    var toBlack = function(stat){
      var specificStatPoints = 0;
      var eitherStatPoints = $scope.unspentStatPoints.either;
      if("m" == stat.type){
        specificStatPoints = $scope.unspentStatPoints.mental;
      }
      else if ("p" == stat.type){
        specificStatPoints = $scope.unspentStatPoints.physical;
      }
      else{
        console.log("Error: Unknown stat type " + stat.type + " passed to incrementStat for stat " + stat.name);
        return;
      } 

      var cost = 5;

      // Put back 'either' points first.
      if( stat.eitherPointsSpent > cost){
        eitherStatPoints += cost;
        stat.eitherPointsSpent -= cost;
        cost = 0;
      }
      else {
        eitherStatPoints += stat.eitherPointsSpent;
        cost = cost - stat.eitherPointsSpent;
        stat.eitherPointsSpent = 0;
      }

      specificStatPoints += cost;
      stat.setSpecificPointsSpent(stat.specificPointsSpent() - cost);

      stat.shade = "B";

      $scope.unspentStatPoints.either = eitherStatPoints;
      if ("m" == stat.type) {
        $scope.unspentStatPoints.mental = specificStatPoints;
      }
      else if ("p" == stat.type){
        $scope.unspentStatPoints.physical = specificStatPoints;
      }
    }

    if(stat.shade == 'B'){
      toGray(stat);
    }
    else if (stat.shade == 'G'){
      toBlack(stat);
    }
    else
      console.log("Error: changing shade of stat failed: unknown shade " + stat.shade);

  }

  $scope.changeAttributeShade = function(attrName){
    // This method toggles between Gray and Black shades.

    var attr = $scope.attribute(attrName);

    if(attr.shade == 'B'){
      // Need 5 points to shift.
      if(attr.exp < 5)
        return;

      $scope.attributeShade[attrName] = 'G';
    }
    else if (attr.shade == 'G'){
      $scope.attributeShade[attrName] = 'B';
    }
    else
      console.log("Error: changing shade of attribute failed: unknown shade " + stat.shade);

  }

  $scope.incrementSkill = function(skill){
    var cost = 1;
    if (skill.pointsSpent() == 0){
      // Magical skills cost 2 points to open.
      cost = skill.costToOpen;
    }

    if ( $scope.unspentSkillPoints["lifepath"] + $scope.unspentSkillPoints["general"] < cost && $scope.enforcePointLimits )
      return;

    // Draw down from the lifepath specific points first, then from general.
    if ( !$scope.isGeneralSkill(skill) && ($scope.unspentSkillPoints["lifepath"] > 0 || ! $scope.enforcePointLimits))
    {
      var toTake = cost;
      if ( toTake > $scope.unspentSkillPoints["lifepath"] )
        totake = $scope.unspentSkillPoints["lifepath"];

      $scope.unspentSkillPoints["lifepath"] -= toTake;
      skill.lifepathPointsSpent += toTake;

      cost -= toTake;
    }
    
    if ( cost > 0 && ($scope.unspentSkillPoints["general"] > 0 || ! $scope.enforcePointLimits))
    {
      $scope.unspentSkillPoints["general"] -= cost;
      skill.generalPointsSpent += cost;
      return;
    }
  }

  $scope.changeTrainingSkill = function($event, skill){
    var checkbox = $event.target;

    if ( ! checkbox.checked ){
      // If this skill is required to be open, do not allow
      // unchecking
      var required = skillsRequiredToBeOpened($scope.selectedLifepaths)
      if (skill.name in required){ 
        checkbox.checked = true;
        return;
      }
      
      if ( skill.generalPointsSpent > 0 ){
        $scope.unspentSkillPoints.general += skill.generalPointsSpent;
        skill.generalPointsSpent = 0;
      }

      if ( skill.lifepathPointsSpent > 0 ){
        $scope.unspentSkillPoints.lifepath += skill.lifepathPointsSpent;
        skill.lifepathPointsSpent = 0;
      }
    } else {
      // User just checked the box.

      if( !$scope.isGeneralSkill(skill) ) {
        if( ($scope.unspentSkillPoints.general + $scope.unspentSkillPoints.lifepath < 2) && $scope.enforcePointLimits ){
          // Not enough points
          checkbox.checked = false;
          return;
        }

        while ( $scope.unspentSkillPoints.lifepath > 0 && skill.pointsSpent() < 2 ){
          skill.lifepathPointsSpent += 1;
          $scope.unspentSkillPoints.lifepath -= 1;
        }

        while ( ($scope.unspentSkillPoints.general > 0 || ! $scope.enforcePointLimits) && skill.pointsSpent() < 2 ){
          skill.generalPointsSpent += 1;
          $scope.unspentSkillPoints.general -= 1;
        }
      } else {
        // This is a general skill. Only general point may be spent.
        if( $scope.unspentSkillPoints.general < 2 && $scope.enforcePointLimits ){
          // Not enough points
          checkbox.checked = false;
          return;
        }

        $scope.unspentSkillPoints.general -= 2;
        skill.generalPointsSpent += 2;
      }
    }
  }

  /*
  // Used by ng-repeat's orderBy filter to sort skills.
  $scope.sortSkills = function(skill){
    return skill.exp($scope.statsByName);
  }
  */

  $scope.decrementSkill = function(skill){
    // If this skill is required to be open, do not allow
    // decrementing below 1.
    var required = skillsRequiredToBeOpened($scope.selectedLifepaths)
    if ( (skill.name in required) && skill.lifepathPointsSpent == 1 && skill.generalPointsSpent == 0 ){
      return;
    }

    var cost = 1;
    if (skill.pointsSpent() == skill.costToOpen){
      // Magical skills cost 2 points to open.
      cost = skill.costToOpen;
    }

    // Put back to the general points first, then to lifepath specific
    if ( skill.generalPointsSpent > 0 ){
      var toGive = cost;
      if (toGive > skill.generalPointsSpent)
        toGive = skill.generalPointsSpent;
      $scope.unspentSkillPoints["general"] += toGive;
      skill.generalPointsSpent -= toGive;

      cost -= toGive;
    }

    if ( skill.lifepathPointsSpent > 0 ){
      $scope.unspentSkillPoints["lifepath"] += cost;
      skill.lifepathPointsSpent -= cost;
      return;
    }
  }

  /* Given a skill name, add a general skill */
  $scope.addGeneralSkill = function(skillName){
    if (skillName in burningData.skills && !(skillName in $scope.lifepathSkills)){
      $scope.generalSkills[skillName] = new DisplaySkill(skillName, burningData.skills);
      applyBonusesFromTraits($scope);
    }
  }

  /* Given a wise name, add a custom wise.*/
  $scope.addCustomWise = function(wiseName){
    wiseName = wiseName.toLowerCase();
    if(endsWith(wiseName, "-wise")){
      wiseName = wiseName.substring(0, wiseName.length-5);
    }
  
    wiseName = capitalizeEachWord(wiseName) + "-wise";

    $scope.generalSkills[wiseName] = new DisplaySkill(wiseName, burningData.skills);
  }

  /* Given the passed display skill, determine if it's in the list of
     general skills selected by the user */
  $scope.isGeneralSkill = function(displaySkill){
    return (displaySkill.name in $scope.generalSkills);
    
  }

  /* Given the passed display skill, remove it from the list of general skills */
  $scope.removeGeneralSkill = function(displaySkill){
    delete $scope.generalSkills[displaySkill.name];
    calculateUnspentSkillPoints($scope);
  }

  // Return a hash containing all skills 
  $scope.allSelectedSkills = function(){
    var result = {}
    for(var key in $scope.lifepathSkills){
      result[key] = $scope.lifepathSkills[key]
    }
    for(var key in $scope.generalSkills){
      result[key] = $scope.generalSkills[key]
    }
    return result;
  }

  // Return a list of skill names that the character can choose
  // from to add a general skill. This is all skills less the 
  // skills the character already has, and less the skills that 
  // are not allowed for the character's stock.
  $scope.selectableGeneralSkills = function(){
    var result = [];
    for(var key in burningData.skills){
      if ( !(key in $scope.lifepathSkills) && !(key in $scope.generalSkills) ){
        var displaySkill = burningData.skills[key];
        if ( !displaySkill.stock || restrictionStockToValidStock(displaySkill.stock) == $scope.stock ) {
          result.push(key);
        }
      }
    }
    // This is hacky, but set the current model value for the dropdown
    if(result.length > 0 && result.indexOf($scope.currentGeneralSkill) < 0 ){
      $scope.currentGeneralSkill = result[0];
    }

    return result.sort();
  }

  // Return a style to be applied to a skill name to indicate whether or not it's open.
  $scope.skillStyle = function(skill){
    if ( skill.pointsSpent() > 0 ){
      return {"font-weight": "bold"};
    } else {
      return {};
    }
  }

  // Return the value of the attribute with the specified name as a hash of [shade : S, exp : E, modifyable : flag]
  $scope.attribute = function(name){

    var computeModifiers = function(name){
      var result = 0;

      var questions = attributeModifyingQuestions($scope, name);
      for(var i = 0; i < questions.length; i++){
        var q = questions[i];
        if ( q.computed ){
          result += q.compute();
        }
      }

      var answers = $scope.attributeModifierQuestionResults[name];
      if ( answers ){
        for(var i = 0; i < answers.length; i++){
          var q = answers[i];
          if ("answer" in q){
            if(q.answer){
              if(q.computeModifier){
                result += q.compute();
              }
              else {
                result += q.modifier;
              }
            }
          }
        }
      }

      return result;
    }

    var computeBonus = function(name){
      var bonus = 0;
      if (name in $scope.attributeBonuses) {
        bonus = $scope.attributeBonuses[name];
      }
      return bonus;
    }

    var bonus = computeBonus(name)

    if( "Mortal Wound" == name ){
      var shadeAndExp;
      if ( $scope.stock == 'troll' || $scope.stock == 'dwarf') {
        shadeAndExp = computeStatAverage($scope.statsByName, ["Power", "Forte"], true);
      } else {
        shadeAndExp = computeStatAverage($scope.statsByName, ["Power", "Forte"]);
      }
      return {"shade" : shadeAndExp[0], "exp" : shadeAndExp[1] + 6 + bonus};
    }
    else if ( "Reflexes" == name ){
      var shadeAndExp = computeStatAverage($scope.statsByName, ["Perception", "Agility", "Speed"]);
      return {"shade" : shadeAndExp[0], "exp" : shadeAndExp[1] + bonus};
    }
    else if ( "Health" == name ){
      var shadeAndExp = computeStatAverage($scope.statsByName, ["Will", "Forte"]);
      shadeAndExp[1] += computeModifiers(name);
      return {"shade" : shadeAndExp[0], "exp" : shadeAndExp[1] + bonus, "modifyable" : true};
    }
    else if ( "Steel" == name ){
      var steel = 3 + computeModifiers(name) + bonus;
      if($scope.attributeShade[name] == 'G'){
        steel -= 5;
      }
      return {"shade" : $scope.attributeShade[name], "exp" : steel, "modifyable" : true};
    }
    else if ( "Hesitation" == name ){
      return {"shade" : "", "exp" : 10 - $scope.statsByName["Will"].exp() + bonus};
    }
    else if ( "Stride" == name ){
      var stride = 0;
      if( $scope.stock == 'dwarf' )
        stride = 6;
      else if( $scope.stock == 'elf' )
        stride = 8;
      else if( $scope.stock == 'roden' )
        stride = 8;
      else if( $scope.stock == 'wolf' )
        stride = 11;
      else
        stride = 7;

      stride += bonus;

      return {"shade" : "", "exp" : stride};
    }
    else if ( "Circles" == name ){
      var v = Math.floor($scope.statsByName["Will"].exp()/2);
      if (v < 1)
        v = 1;

      var sum = 0;
      var reputations = hashValues($scope.reputations);
      for(var i = 0; i < reputations.length; i++){
        sum += reputations[i].cost;
      }
      var property = hashValues($scope.property);
      for(var i = 0; i < property.length; i++){
        sum += property[i].cost;
      }
  
      if ( sum >= 50 ){
        v += 1;
      }

      v += bonus;
  
      return {"shade" : "B", "exp" : v};
    }
    else if ( "Resources" == name ){
      var sum = 0;
      var reputations = hashValues($scope.reputations);
      for(var i = 0; i < reputations.length; i++){
        sum += reputations[i].cost;
      }
      var affiliations = hashValues($scope.affiliations);
      for(var i = 0; i < affiliations.length; i++){
        sum += affiliations[i].cost;
      }
      var property = hashValues($scope.property);
      for(var i = 0; i < property.length; i++){
        sum += property[i].cost;
      }
      return { "shade" : "B", "exp" : Math.floor(sum / 15) + bonus};
    }
    else if ( "Hatred" == name ){
      var hate = computeModifiers(name);
      if($scope.attributeShade[name] == 'G'){
        hate -= 5;
      }
      hate += bonus;
      return { "shade" : $scope.attributeShade[name], "exp" : hate, "modifyable" : true};
    }
    else if ( "Greed" == name ){
      var greed = computeModifiers(name);
      if($scope.attributeShade[name] == 'G'){
        greed -= 5;
      }
      greed += bonus;
      return { "shade" : $scope.attributeShade[name], "exp" : greed, "modifyable" : true};
    }
    else if ( "Grief" == name ){
      var grief = computeModifiers(name);
      if($scope.attributeShade[name] == 'G'){
        grief -= 5;
      }
      grief += bonus;
      return { "shade" : $scope.attributeShade[name], "exp" : grief, "modifyable" : true};
    }
    else if ( "Spite" == name ){
      var spite = computeModifiers(name);
      if($scope.attributeShade[name] == 'G'){
        spite -= 5;
      }
      spite += bonus;
      return { "shade" : $scope.attributeShade[name], "exp" : spite, "modifyable" : true};
    }
    else if ( "Faith" == name ){
      var faith = 3 + computeModifiers(name);
      faith += bonus;
      return { "shade" : 'B', "exp" : faith, "modifyable" : true};
    }
    else if ( "Ancestral Taint" == name ){
      // Taint starts +1 for Ancestral Taint (which is automatically given when Chosen Wolf is purchased)
      var taint = 1 + computeModifiers(name);
      taint += bonus;
      return { "shade" : $scope.statsByName["Will"].shade, "exp" : taint, "modifyable" : true};
    }
  }

  $scope.distributeStats = function(){
    // Change all stats to black
    for(var i = 0; i < $scope.stats.length; i++){
      $scope.stats[i].shade = 'B';
    }

    // Divide 'either' pool evenly between physical and mental
    var eitherBuckets = divideIntoBuckets($scope.totalStatPoints.either, 2);

    // Divide mental between each mental stat
    var mentalBuckets = divideIntoBuckets($scope.totalStatPoints.mental, 2);
    var mentalEitherBuckets = divideIntoBuckets(eitherBuckets[0], 2);

    // Divide physical between each physical stat
    var physicalBuckets = divideIntoBuckets($scope.totalStatPoints.physical, 4);
    var physicalEitherBuckets = divideIntoBuckets(eitherBuckets[1], 4);
  
    $scope.statsByName.Will.mentalPointsSpent = mentalBuckets[0];
    $scope.statsByName.Will.eitherPointsSpent = mentalEitherBuckets[1];
    $scope.statsByName.Perception.mentalPointsSpent = mentalBuckets[1];
    $scope.statsByName.Perception.eitherPointsSpent = mentalEitherBuckets[0];

    $scope.statsByName.Power.physicalPointsSpent = physicalBuckets[0];
    $scope.statsByName.Power.eitherPointsSpent = physicalEitherBuckets[3];
    $scope.statsByName.Speed.physicalPointsSpent = physicalBuckets[1]
    $scope.statsByName.Speed.eitherPointsSpent = physicalEitherBuckets[2]
    $scope.statsByName.Agility.physicalPointsSpent = physicalBuckets[2]
    $scope.statsByName.Agility.eitherPointsSpent = physicalEitherBuckets[1]
    $scope.statsByName.Forte.physicalPointsSpent = physicalBuckets[3]
    $scope.statsByName.Forte.eitherPointsSpent = physicalEitherBuckets[0]

    // Sanity check
    var sum = 0;
    for(var i = 0; i < $scope.stats.length; i++){
      sum += $scope.stats[i].exp() - $scope.stats[i].bonus;
    }
    if ( sum != $scope.totalStatPoints.either + $scope.totalStatPoints.mental + $scope.totalStatPoints.physical ) {
      console.log("Error: Calculation in distributeStats is incorrect.");
      
      for(var i = 0; i < $scope.stats.length; i++){
        $scope.stats[i].physicalPointsSpent = 0;
        $scope.stats[i].mentalPointsSpent = 0;
        $scope.stats[i].eitherPointsSpent = 0;
      }
    }

    calculateUnspentStatPoints($scope);
    calculatePTGS($scope);
  }

  $scope.lifepathTraitsForDisplay = function(){
    var list = [];
    var traits = hashValues($scope.lifepathTraits);
    for(var i = 0; i < traits.length;  i++){
      if ( ! (traits[i].name in $scope.purchasedTraits) && ! (traits[i].name in $scope.requiredTraits) ){
        list.push(traits[i].name + ": 1pt");
      }
    }

    if(list.length > 0 && list.indexOf($scope.currentLifepathTrait) < 0 ){
      $scope.currentLifepathTrait = list[0];
    }

    return list;
  }
/*
  
  $scope.specialTraitsForDisplay = function(){
    var list = [];

    for(var traitName in burningData.traits) {
      var trait = burningData.traits[traitName];
  
      if ('restrict' in trait){
        if ( trait.restrict.indexOf(validStockToRestrictionStock($scope.stock)) >= 0 &&  
          (trait.restrict.indexOf("special") >= 0 || trait.restrict.indexOf("character") >= 0) ){
          list.push(new DisplayTrait(traitName, burningData.traits));
        }
      } else {
        // No restriction! As long as cost > 0 (cost 0 is for traits with no cost; not purchaseable)
        if ( trait.cost > 0 ) {
          list.push(new DisplayTrait(traitName, burningData.traits));
        }
      }
    }

    return list;
  } 
*/

  $scope.addLifepathTrait = function(traitName){
    if ( $scope.unspentTraitPoints < 1 && $scope.enforcePointLimits )
      return;

    traitName = traitName.split(":")[0];
    if ( !(traitName in $scope.purchasedTraits) && !(traitName in $scope.requiredTraits)){
      $scope.purchasedTraits[traitName] = new DisplayTrait(traitName, burningData.traits);
      $scope.unspentTraitPoints -= 1;
    }
    calculateTraitWarnings($scope, burningData);
    applyBonusesFromTraits($scope);
  }

  /* Given the passed display trait, remove it from the list of purchased traits*/
  $scope.removeTrait = function(trait){
    delete $scope.purchasedTraits[trait.name];
    calculateUnspentTraitPoints($scope);
    calculateTraitWarnings($scope, burningData);
    applyBonusesFromTraits($scope);
  }

  $scope.addSpecialTrait = function(trait){
    traitName = trait.name;
    if ( !(traitName in $scope.purchasedTraits) && !(traitName in $scope.requiredTraits)){
      if ( trait.cost <= $scope.unspentTraitPoints || !$scope.enforcePointLimits){
        $scope.purchasedTraits[traitName] = trait;
        $scope.unspentTraitPoints -= trait.cost;
      }
      else {
        $scope.addAlert('trait', "You don't have enough trait points for that.");
      }
    }
    calculateTraitWarnings($scope, burningData);
    applyBonusesFromTraits($scope);
  }

  $scope.convertCurrentCharacterToStruct = function(){
    return convertCurrentCharacterToStruct($scope, appropriateWeapons);
  }

  $scope.loadCurrentCharacterFromStruct = function(charStruct){
    loadCurrentCharacterFromStruct($scope, charStruct, burningData, appropriateWeapons);
  }

  $scope.convertCurrentCharacterToStructForCharSheet = function(){
    // Format:
    // {
    //   :name => string,
    //   :stock => string,
    //   :age => integer,
    //   :stock => string,
    //   :lifepaths => [string, string,...]
    //   :stats => { :will => ["B", 5], ...}
    //   :attributes => { :health => ["B", 5], ...}
    //   :skills => [
    //     [name, shade, exponent]
    //   ]
    //   :traits => [
    //     [name, type]
    //   ]
    //   :ptgs => { :su => ["B1"], ... }
    // }


    // Structure:
    var chardata = {
      "name" : $scope.name,
      "age" : $scope.age,
      "stock" : $scope.stock
    };

    var lifepaths = [];
    for(var i = 0; i < $scope.selectedLifepaths.length; i++){
      var displayLp = $scope.selectedLifepaths[i];
      lifepaths.push(displayLp.displayName);
    }
    chardata.lifepaths = lifepaths;

    var stats = {};
    for(var i = 0; i < $scope.stats.length; i++){
      var displayStat = $scope.stats[i];

      stats[displayStat.name.toLowerCase()] = [displayStat.shade, displayStat.exp()];
    }
    chardata.stats = stats;

    var attrs = {};
    var attributeNames = $scope.attributeNames();
    for(var i = 0; i < attributeNames.length; i++){
      var attr = $scope.attribute(attributeNames[i]);
      attrs[attributeNames[i].toLowerCase()] = [attr.shade, attr.exp];
    }
    chardata.attributes = attrs;

    var skills = [];
    for(var key in $scope.lifepathSkills){
      var displaySkill = $scope.lifepathSkills[key];
      if( displaySkill.pointsSpent() > 0 )
        skills.push([displaySkill.name, displaySkill.shade($scope.statsForSkillCalc), displaySkill.exp($scope.statsForSkillCalc), displaySkill.isTraining]);
    }
    for(var key in $scope.generalSkills){
      var displaySkill = $scope.generalSkills[key];
      if( displaySkill.pointsSpent() > 0 )
        skills.push([displaySkill.name, displaySkill.shade($scope.statsForSkillCalc), displaySkill.exp($scope.statsForSkillCalc), displaySkill.isTraining]);
    }

    chardata.skills = skills

    var traits = [];
    for(var key in $scope.purchasedTraits){
      var displayTrait = $scope.purchasedTraits[key];
      traits.push([displayTrait.name, displayTrait.type]);
    }
    for(var key in $scope.requiredTraits){
      var displayTrait = $scope.requiredTraits[key];
      traits.push([displayTrait.name, displayTrait.type]);
    }
    for(var key in $scope.commonTraits){
      var displayTrait = $scope.commonTraits[key];
      traits.push([displayTrait.name, displayTrait.type]);
    }
    chardata.traits = traits;

    // Resources
    var serializeResource = function(resourceHash, coder){
      var resourceList = hashValues(resourceHash);
      var res = [];
      for(var i = 0; i < resourceList.length; i++){
        var display = resourceList[i];
        res.push( coder(display) );
      }
      return res;
    }

    var res = serializeResource( $scope.gear, function(display){
      return display.desc
    });
    chardata.gear = res;

    var res = serializeResource( $scope.property, function(display){
      return display.desc
    });
    chardata.property = res;

    res = serializeResource( $scope.relationships, function(display){
      return display.desc
    });
    chardata.relationships = res;

    res = serializeResource( $scope.reputations, function(display){
      return display.desc + " " + display.dice + "D";
    });
    chardata.reputations = res;

    res = serializeResource( $scope.affiliations, function(display){
      return display.desc + " " + display.dice + "D";
    });
    chardata.affiliations = res;

    chardata.ptgs = {
      "su": $scope.ptgs.su,
      "li": $scope.ptgs.li,
      "mi": $scope.ptgs.mi,
      "se": $scope.ptgs.se,
      "tr": $scope.ptgs.tr,
      "mo": $scope.ptgs.mo,
    };

    chardata.attr_mod_questions = convertAttributeModifierQuestionResultsForCharsheet($scope);

    return chardata;
  }

  $scope.makeCharsheetForCurrentCharacter = function(){
    var json = angular.toJson($scope.convertCurrentCharacterToStructForCharSheet(), true);
    $http.post("/charsheet", json).
      success(function(data,status,headers,config){
        console.log("huzzah, making charsheet succeeded. File URL: " + data);
        var frame = document.getElementById("downloadframe");
        if ( frame ){
          frame.src = data;
        }
      }).
      error(function(data,status,headers,config){
        console.log("boo, making charsheet failed: " + data);
        $scope.addAlert('tools', "Generating character sheet failed: " + data);
      });
  }

  // Launch a download for the current character. Since Javascript can't really 
  // launch a download using data from javascript, we need to pass the current character
  // to the server which sends a filename back to a hidden iframe which then launches the download.
  $scope.downloadCurrentCharacter = function(){
    var nameWarn = "The character must have a name before it can be downloaded.";
    if( $scope.name.length == 0 ){
      $scope.addAlert('tools', nameWarn);
      return;
    }
    else {
      $scope.removeAlert('tools', nameWarn);
    }

    var json = angular.toJson($scope.convertCurrentCharacterToStruct(), true);
    $http.post("/download_charfile", json).
      success(function(data,status,headers,config){
        console.log("huzzah, making character data file succeeded. File URL: " + data);
        var frame = document.getElementById("downloadframe");
        if ( frame ){
          frame.src = data;
        }
      }).
      error(function(data,status,headers,config){
        console.log("boo, making character data file failed: " + data);
        $scope.addAlert('tools', "Generating character file failed: " + data);
      });
  }

  $scope.saveCurrentCharacterToServer = function(){
    var nameWarn = "The character must have a name before it can be saved.";
    if( $scope.name.length == 0 ){
      $scope.addAlert('tools', nameWarn);
      return;
    }
    else {
      $scope.removeAlert('tools', nameWarn);
    }

    var json = angular.toJson($scope.convertCurrentCharacterToStruct(), true);

    var url = "/create_char/user1/" + $scope.name;
    if ( $scope.charid != null ){
      url = "/update_char/user1/" + $scope.charid + "/" + $scope.name;
    }

    $http.post(url, json).
      success(function(data,status,headers,config){
        if ( $scope.charid == null ){
          // Create
          console.log("huzzah, creating character succeeded. Character id = " + data['id']);
          $scope.charid = data['id']
          characterStorage.loadCharacterNames();
        }
        else {
          console.log("huzzah, updating character succeeded. Character id = " + data['id']);
        }
        $scope.addAlert('tools', "Character was successfully saved.", 'succ');
      }).
      error(function(data,status,headers,config){
        console.log("boo, saving character failed: " + data);
        $scope.addAlert('tools', data);
      });
  }

  $scope.loadCharacterFromServer = function(characterIdAndNameToLoad){
    if( characterIdAndNameToLoad == null ){
      $scope.addAlert('tools', "Select a character to load.");
      return;
    }

    $http.get("/get_char/user1/" + characterIdAndNameToLoad[0], {'timeout': 3000} ).
      success(function(data,status,headers,config){
        console.log("Loaded character");
        loadCurrentCharacterFromStruct($scope, data, burningData, appropriateWeapons);
        $scope.charid = characterIdAndNameToLoad[0];
      }).
      error(function(data,status,headers,config){
        console.log("Error: Loading saved character from server failed: HTTP code " + status + ": " + data);
      });
  }

  $scope.deleteCharacterOnServer = function(characterIdAndNameToLoad){
    if( characterIdAndNameToLoad == null ){
      $scope.addAlert('tools', "Select a character to delete.");
      return;
    }

    $http.get("/delete_char/user1/" + characterIdAndNameToLoad[0], {'timeout': 3000} ).
      success(function(data,status,headers,config){
        console.log("Deleted character");
        characterStorage.loadCharacterNames();
        $scope.addAlert('tools', "Character was successfully deleted.", 'succ');
      }).
      error(function(data,status,headers,config){
        console.log("Error: Deleting saved character from server failed: HTTP code " + status + ": " + data);
      });
  }

  $scope.addResource = function(type){
    
    var resource = null;
    var resourceHash = null;
    if(type == 'relationship'){
      resource = new DisplayRelationship(
        $scope.currentRelationshipDesc,
        $scope.currentRelationshipImportance,
        $scope.currentRelationshipIsImmedFam,
        $scope.currentRelationshipIsOtherFam,
        $scope.currentRelationshipIsRomantic,
        $scope.currentRelationshipIsForbidden,
        $scope.currentRelationshipIsHateful
      );
      resourceHash = $scope.relationships;
    }
    else if (type == 'gear'){
      var cost = parseInt($scope.currentGearCost);
      if ( isNaN(cost) )
        return;

      resource = new DisplayGear (
        $scope.currentGearDesc,
        cost
      );
      resourceHash = $scope.gear;
    }
    else if (type == 'property'){
      var cost = parseInt($scope.currentPropertyCost);
      if ( isNaN(cost) )
        return;

      resource = new DisplayGear (
        $scope.currentPropertyDesc,
        cost
      );
      resourceHash = $scope.property;
    }
    else if (type == 'affiliation'){
      resource = new DisplayAffiliation(
        $scope.currentAffiliationDesc,
        $scope.currentAffiliationImportance
      );
      resourceHash = $scope.affiliations;
    }
    else if (type == 'reputation'){
      resource = new DisplayReputation(
        $scope.currentReputationDesc,
        $scope.currentReputationImportance
      );
      resourceHash = $scope.reputations;
    }

    // If this already exists, ignore the new entry.
    if ( resourceHash[resource.desc] ){
      $scope.addAlert('resources', "You already have that " + type + ".");
      return;
    }
    if ( resource.desc.length == 0 ){
      return;
    }
    if ( resource.cost > $scope.unspentResourcePoints && $scope.enforcePointLimits){
      $scope.addAlert('resources', "You don't have enough resource points for that.");
      return;
    }

    resourceHash[resource.desc] = resource;
    calculateUnspentResourcePoints($scope);

  }
  
  $scope.addSelectListGear = function(){
    var name = "";
    var cost = 0;
    for(var i = 2; i >= 0; i--){
      if($scope.currentSelectListGear[i]){
        var gear = $scope.currentSelectListGear[i];
        if(gear.cost){
          cost = gear.cost;
        }
        if(gear.name){
          if(name.length > 0){
            name = gear.name + ", " + name;
          }
          else{
            name = gear.name;
          }
        }
      }
    }
  
    $scope.currentGearDesc = name;
    $scope.currentGearCost = cost;
    $scope.addResource('gear');
  }

  $scope.addSelectListProperty = function(){
    var name = "";
    var cost = 0;
    for(var i = 2; i >= 0; i--){
      if($scope.currentSelectListProperty[i]){
        var property = $scope.currentSelectListProperty[i];
        if(property.cost){
          cost = property.cost;
        }
        if(property.name){
          if(name.length > 0){
            name = property.name + ", " + name;
          }
          else{
            name = property.name;
          }
        }
      }
    }
  
    $scope.currentPropertyDesc = name;
    $scope.currentPropertyCost = cost;
    $scope.addResource('property');
  }

  $scope.removeResource = function(type, display){
    var resourceHash = null;
    if(type == 'relationship'){
      resourceHash = $scope.relationships;
    }
    else if (type == 'gear'){
      resourceHash = $scope.gear;
    }
    else if (type == 'property'){
      resourceHash = $scope.property;
    }
    else if (type == 'affiliation'){
      resourceHash = $scope.affiliations;
    }
    else if (type == 'reputation'){
      resourceHash = $scope.reputations;
    }
    $scope.resourceAdderToShow = type;
    populateUiFieldsFromDisplayResource($scope, type, resourceHash[display.desc]);

    delete resourceHash[display.desc];
    calculateUnspentResourcePoints($scope);
  }

  $scope.addAlertNoTimeout = function(section, desc, type){
    if(!type)
      type = 'warn';

    var h = $scope.alerts[section];
    h[desc] = new Alert(desc, type);
    $scope.alerts[section] = h;
  }

  $scope.addAlert = function(section, desc, type){
    $scope.addAlertNoTimeout(section, desc, type);

    $timeout(function(){
        $scope.removeAlert(section, desc);
      }, 4000);
  }

  $scope.removeAlert = function(section, desc) {
    var h = $scope.alerts[section];
    delete h[desc];
    $scope.alerts[section] = h;
  }

  $scope.alertsOfType = function(section, type) {
    var h = $scope.alerts[section];
    var rc = [];
    for(key in h){
      var a = h[key];
      if(a.type == type)
        rc.push(a.desc);
    }
    return rc;
  }

  $scope.answerEmotionalAttributeQuestions = function (attributeName){
    
    // If the character already has some or all of the questions answered, pass those in.
    // Otherwise generate new ones.

    var questions = attributeModifyingQuestions($scope, attributeName);
    if ( ! questions)
      return;

    if ( attributeName in $scope.attributeModifierQuestionResults ){
      questions = $scope.attributeModifierQuestionResults[attributeName];
    }

    var modalInstance = $modal.open({
      templateUrl: '/emotional_attr_questions_partial',
      controller: EmotionalAttributeModalCtrl,
      resolve: {
        attributeName: function() {
          return attributeName;
        },
        questions: function () {
          return questions;
        },
        displayEmotionalMath: function () {
          return serverSettings.displayAttrMath;
        },
      } 
    });
  
    modalInstance.result.then(function (selected) {
      $scope.attributeModifierQuestionResults[attributeName] = selected;
    }, function () {
      console.log("Modal: User cancelled");
    });
  }

  $scope.chooseCharacterToLoad = function() {

    var modalInstance = $modal.open({
      templateUrl: '/choose_character_partial',
      controller: ChooseCharacterModalCtrl,
      resolve: {
        characterStorage: function() {
          return $scope.characterStorage;
        },
        message: function() {
          return "Choose Character to Load";
        }
      }
    });

    modalInstance.result.then(function (selected) {
      console.log("Modal: User selected:");

      console.log(selected);
      for(var i = 0; i < selected.length; i++){
        console.log(selected[i]);
      }

      $scope.loadCharacterFromServer(selected);

    }, function () {
      console.log("Modal: User cancelled");
    });
  }

  $scope.chooseCharacterToDelete = function() {

    var modalInstance = $modal.open({
      templateUrl: '/choose_character_partial',
      controller: ChooseCharacterModalCtrl,
      resolve: {
        characterStorage: function() {
          return $scope.characterStorage;
        },
        message: function() {
          return "Choose Character to Delete";
        }
      }
    });

    modalInstance.result.then(function (selected) {
      console.log("Modal: User selected:");

      console.log(selected);
      for(var i = 0; i < selected.length; i++){
        console.log(selected[i]);
      }

      $scope.deleteCharacterOnServer(selected);

    }, function () {
      console.log("Modal: User cancelled");
    });
  }

  $scope.chooseTraitUsingAdvancedSearch = function() {

    var modalInstance = $modal.open({
      templateUrl: '/choose_trait_partial',
      controller: TraitSearchModalCtrl,
      resolve: {
        specialTraitsForDisplay: function() {
          return $scope.specialTraitsForDisplay;
        },
        totalTraitPoints: function(){
          return $scope.totalTraitPoints;
        },
        unspentTraitPoints: function(){
          return $scope.unspentTraitPoints;
        }
      }
    });

    modalInstance.result.then(function (selected) {
      console.log("TraitSearchModalCtrl: User selected:");

      console.log(selected);

      $scope.addSpecialTrait(selected);
    }, function () {
      console.log("Modal: User cancelled");
    });
  }

  $scope.showUploadCharacterModal = function (){
    
    var modalInstance = $modal.open({
      templateUrl: '/upload_character_partial',
      controller: UploadCharacterModalCtrl
    });
  
    modalInstance.result.then(function () {
      console.log("Modal: Uploaded character");
    }, function () {
      console.log("Modal: User cancelled");
    });
  }

  $scope.chooseStatPenalties = function(lifepath, amount) {

    var modalInstance = $modal.open({
      templateUrl: '/choose_stat_penalty_partial',
      controller: StatPenaltyModalCtrl,
      resolve: {
        lifepath: function() {
          return lifepath;
        },
        amount: function() {
          return amount;
        }
      }
    });

    modalInstance.result.then(function (pool) {
      console.log("Modal: User selected ", pool);

      // Now we want to modify the lifepath so that the 'either'
      // penalty is removed and replaced with the physical and mental
      // penalties the user selected. The returned penalties are positive.
      var p = -pool.physical;
      var m = -pool.mental;

      for(var i = 0; i < displayLp.stat.length; i++){
        var stat = displayLp.stat[i];

        if(stat[1] == 'p'){
          p += stat[0]
        }
        else if (stat[1] == 'm'){
          m += stat[0]
        }
      }

      displayLp.stat = [ [p, 'p'], [m, 'm'] ];
      calculateTotalStatPoints($scope, burningData);
      calculateUnspentStatPoints($scope);

    }, function () {
      console.log("Modal: User cancelled");
    });
  }


}

function ConfigCtrl($scope, settings, appropriateWeapons) {
  $scope.enforceLifepathReqts = settings.enforceLifepathReqts
  $scope.enforcePointLimits = settings.enforcePointLimits

  $scope.appropriateWeapons = appropriateWeapons.appropriateWeapons;

  // Export the hashKeys function
  $scope.hashKeys = hashKeys;

  $scope.currentAppropriateWeaponLifepath = null;

  $scope.applySettings = function(){
    settings.enforceLifepathReqts = $scope.enforceLifepathReqts;
    settings.enforcePointLimits = $scope.enforcePointLimits;
  }

  $scope.editAppropriateWeapons = function(){
    if ( $scope.currentAppropriateWeaponLifepath ){
      appropriateWeapons.selectAppropriateWeaponsByLifepathName($scope.currentAppropriateWeaponLifepath, null);
    }
  }

  $scope.deleteAppropriateWeapons = function(){
    if ( $scope.currentAppropriateWeaponLifepath ){
      delete appropriateWeapons.appropriateWeapons[$scope.currentAppropriateWeaponLifepath];
    }
  }

}


function onLifepathsLoad($scope, burningData){
  calculateSettingNames($scope, burningData);
  $scope.onSettingChange();
  calculateSpecialTraitsForDisplay($scope, burningData);
}

function calculateAge($scope){
  var age = 0;
  var lastSetting = null;
  for(var i = 0; i < $scope.selectedLifepaths.length; i++){
    var displayLp = $scope.selectedLifepaths[i];
    if ( lastSetting && lastSetting != displayLp.setting && $scope.stock != "wolf"){
      // New setting. Increase age by 1. Wolves don't suffer this penalty.
      age += 1;
    }
    lastSetting = displayLp.setting;
    age += displayLp.time;
  }
  $scope.age = age;
}

function calculateSettingNames($scope, burningData){
  var settingNames = null;

  var lastCurrentSetting = $scope.currentSetting; 

  if ( ! $scope.enforceLifepathReqts ) {
    // Display all settings and subsettings
    settingNames = [];
    for(key in burningData.lifepaths[$scope.stock]){
      settingNames.push(key);
    }
  }
  else if ( $scope.selectedLifepaths.length == 0 ){
    // All settings are allowed. Subsettings have no Born lifepath so don't include them.
    settingNames = [];
    for(key in burningData.lifepaths[$scope.stock]){
      if( key.toLowerCase().indexOf("subsetting") < 0 ){
        settingNames.push(key);
      }
    }
  }
  else {
    // Only settings that are leads from the last lifepath are allowed
    var lastLifepath = $scope.selectedLifepaths[$scope.selectedLifepaths.length-1];
    settingNames = [];
    var all = Object.keys(burningData.lifepaths[$scope.stock]);
    for(var i = 0; i < all.length; i++){
      //console.log("calculateSettingNames: checking if '"+all[i]+"' is allowed");
      var setting = all[i];

      if ( lastLifepath.setting == setting ){
        settingNames.push(setting);
        continue;
      }

      if ( lastLifepath.leads ){
        for(var j = 0; j < lastLifepath.keyLeads.length; j++){
          var lead = lastLifepath.keyLeads[j];
          //console.log("calculateSettingNames:   checking lead: '"+lead+"' is allowed");

          if( setting == lead ){
            settingNames.push(setting);
          }
        }
      }
    }
  }

  $scope.settingNames = settingNames;

  var currentSettingNeedsUpdate = true;
  for(var i = 0; i < $scope.settingNames.length; i++){
    if( $scope.settingNames[i] == lastCurrentSetting){
      currentSettingNeedsUpdate = false;
      break;
    }
  }

  if ( currentSettingNeedsUpdate && $scope.settingNames.length > 0 ){
    $scope.currentSetting = $scope.settingNames[0];
  }

}

function calculatePTGS($scope) {
  $scope.ptgs.calculate($scope.statsByName['Forte'].exp(), $scope.attribute("Mortal Wound").exp)
}


function isBornLifepath(lifepathName) {
  return lifepathName.indexOf("Born") >= 0 ||
         lifepathName == "Son Of A Gun" ||
         lifepathName == "Gifted Child";
}


function calculateCurrentSettingLifepathNames($scope, burningData){
  var currentSettingLifepathNames = null;

  if($scope.enforceLifepathReqts){
    //console.log("calculateCurrentSettingLifepathNames: enforce lifepath requirements is enabled");            
    currentSettingLifepathNames = []; 
    var all = Object.keys(burningData.lifepaths[$scope.stock][$scope.currentSetting])
    // Filter out the names that are not allowed based on the character's lifepaths.
    if ( $scope.selectedLifepaths.length == 0 ){
      // Only "Born" lifepaths are allowed
      for(var i = 0; i < all.length; i++){
        if ( isBornLifepath(all[i]) ){
          currentSettingLifepathNames.push(all[i]);
        }
      }
    }
    else {
      var lifepathNames = Object.keys(burningData.lifepaths[$scope.stock][$scope.currentSetting])
      for(var j = 0; j < lifepathNames.length; j++){
        var lifepathName = lifepathNames[j];

        if ( isBornLifepath(lifepathName) )
          continue;

        var rexpr = burningData.lifepaths[$scope.stock][$scope.currentSetting][lifepathName].requires_expr
        if (rexpr){
          var result = areLifepathRequirementsSatisfied($scope, rexpr);
          //console.log(settingName + ":" + lifepathName + " allowed: " + (result[0] ? "yes" : "no"));
          //console.log("rexpr: " + rexpr);
          if(result[0]){
            //console.log("calculateCurrentSettingLifepathNames: added because lifepath has reqts, which are met: " + lifepathName);            
            currentSettingLifepathNames.push(lifepathName);
          }
          else {
            //console.log("calculateCurrentSettingLifepathNames: not added because lifepath has reqts, which not are met: " + lifepathName);            
          }
        }
        else {
          currentSettingLifepathNames.push(lifepathName);
        }
      }

    }
  } 
  else {
    currentSettingLifepathNames = Object.keys(burningData.lifepaths[$scope.stock][$scope.currentSetting]);
  }

  $scope.currentSettingLifepathNames = currentSettingLifepathNames;

  var currentSettingLifepathIsPresent = false;
  if ( $scope.currentSettingLifepathNames.length > 0 ){
    for(var i = 0; i < $scope.currentSettingLifepathNames.length; i++){
      var name = $scope.currentSettingLifepathNames[i];
      if ( name == $scope.currentSettingLifepath ){
        currentSettingLifepathIsPresent = true;
        break;
      }
    }
    if ( ! currentSettingLifepathIsPresent )
      $scope.currentSettingLifepath = $scope.currentSettingLifepathNames[0];
  }

}

function calculateTotalStatPoints($scope, burningData){
  
  var totalStatPoints = {"physical" : 0, "mental" : 0, "either" : 0};
  $scope.totalStatPoints = {"physical" : 0, "mental" : 0, "either" : 0};

  var mp = burningData.startingStatPts[$scope.stock].lookup($scope.age);
  totalStatPoints.mental = mp[0];
  totalStatPoints.physical = mp[1];

  for(var i = 0; i < $scope.selectedLifepaths.length; i++){
    var displayLp = $scope.selectedLifepaths[i];
    for(var j = 0; j < displayLp.stat.length; j++){
      var stat = displayLp.stat[j]
      if(stat[1] == 'p'){
        totalStatPoints.physical += stat[0];
      }
      else if (stat[1] == 'm'){
        totalStatPoints.mental += stat[0];
      }
      else if (stat[1] == 'pm' || stat[1] == 'mp'){
        totalStatPoints.either += stat[0];
      }
    }
  }

  $scope.totalStatPoints = totalStatPoints;
}

/*
  Preconditions: totalStatPoints is up to date.
*/
function calculateUnspentStatPoints($scope){
  
  var unspentStatPoints = {
    "physical" : $scope.totalStatPoints.physical, 
    "mental" : $scope.totalStatPoints.mental, 
    "either" : $scope.totalStatPoints.either
  }

  for(var i = 0; i < $scope.stats.length; i++){
    var stat =  $scope.stats[i];
    unspentStatPoints.mental -= stat.mentalPointsSpent;
    unspentStatPoints.physical -= stat.physicalPointsSpent;
    unspentStatPoints.either -= stat.eitherPointsSpent;
  }

  $scope.unspentStatPoints = unspentStatPoints;
}

/*
Based on the chosen lifepaths, make a set of skills that the character
can or must take.
*/
function calculateLifepathSkills($scope, burningData, appropriateWeapons){
  var lifepathSkills = {};

  for(var i = 0; i < $scope.selectedLifepaths.length; i++){
    var displayLp = $scope.selectedLifepaths[i];
    
    appropriateWeapons.replaceAppropriateWeaponsUsingSaved(displayLp);
    displayLp.replaceWeaponOfChoice();

    for(var j = 0; j < displayLp.skills.length; j++){
      var name = displayLp.skills[j];
      if ( name != "General"){
        lifepathSkills[name] = new DisplaySkill(name, burningData.skills);
      }
    } 
  }

  $scope.lifepathSkills = lifepathSkills;
}

function calculateTotalSkillPoints($scope){
  var totalSkillPoints = {"lifepath" : 0, "general" : 0}

  for(var i = 0; i < $scope.selectedLifepaths.length; i++){
    var displayLp = $scope.selectedLifepaths[i];
    totalSkillPoints.lifepath += displayLp.lifepathSkillPts;
    totalSkillPoints.general += displayLp.generalSkillPts;
  }

  $scope.totalSkillPoints = totalSkillPoints
}

function calculateUnspentSkillPoints($scope){
  var unspentSkillPoints = {
    "lifepath" : $scope.totalSkillPoints.lifepath, 
    "general" : $scope.totalSkillPoints.general
  }
  
  for(var key in $scope.lifepathSkills){
    var skill = $scope.lifepathSkills[key]
    
    unspentSkillPoints.lifepath -= skill.lifepathPointsSpent;
    unspentSkillPoints.general -= skill.generalPointsSpent;
  }

  for(var key in $scope.generalSkills){
    var skill = $scope.generalSkills[key]
    
    unspentSkillPoints.lifepath -= skill.lifepathPointsSpent;
    unspentSkillPoints.general -= skill.generalPointsSpent;
  }

  $scope.unspentSkillPoints = unspentSkillPoints;
}

function openRequiredSkills($scope){
  var required = skillsRequiredToBeOpened($scope.selectedLifepaths);

  var unspentSkillPoints = {
    "lifepath" : $scope.unspentSkillPoints.lifepath, 
    "general" : $scope.unspentSkillPoints.general
  }

  for(var key in required){
    // Do nothing if the skill is already opened
    if($scope.lifepathSkills[key].pointsSpent() > 0 ){
      continue;
    }

    if($scope.lifepathSkills[key].exp($scope.statsForSkillCalc) == 0){
      if ( $scope.lifepathSkills[key].isTraining || $scope.lifepathSkills[key].isMagic ){
        $scope.lifepathSkills[key].lifepathPointsSpent += 2;
        unspentSkillPoints.lifepath -= 2;
      } else {
        $scope.lifepathSkills[key].lifepathPointsSpent += 1;
        unspentSkillPoints.lifepath -= 1;
      }
    }
  }

  $scope.unspentSkillPoints = unspentSkillPoints;
}

/*
  Return a hash of skill names that are required to be open
  due to lifepaths.
*/
function skillsRequiredToBeOpened(lifepaths){
  var skillHash = {};
  for(var i = 0; i < lifepaths.length; i++){
    for(var j = 0; j < lifepaths[i].skills.length; j++){
      var skillName = lifepaths[i].skills[j];
      if ( ! (skillName in skillHash) ){
        skillHash[skillName] = 1;
        break;
      }
    }
  } 

  return skillHash;
}

/*
  When a lifepath is removed, the stat points spent may be more than the available, 
  leading to a negative amount available. This method attempts to correct the situation
  by lowering the spent points.
*/
function correctStatPoints($scope){
  correctStatPointsHelperLowerPointsOfType($scope, 'physical', 'physicalPointsSpent');
  correctStatPointsHelperLowerPointsOfType($scope, 'mental', 'mentalPointsSpent');
  correctStatPointsHelperLowerPointsOfType($scope, 'either', 'eitherPointsSpent');
}

/*
  Helper function used by correctStatPoints. This function tries to correct the deficit in 
  $scope.unspentStatPoints for the specified 'unspentStatField' (one of physical, mental, or either)
  by unspending points from the stats, using the field 'displayStatField' 
  (one of physicalPointsSpent, mentalPointsSpent, eitherPointsSpent) 
*/
function correctStatPointsHelperLowerPointsOfType($scope, unspentStatField, displayStatField){
  if ( $scope.unspentStatPoints[unspentStatField] < 0 ){
    for(var i = 0; i < $scope.stats.length; i++){
      var needed = -$scope.unspentStatPoints[unspentStatField];
      if(needed == 0){
        break;
      }

      if( $scope.stats[i][displayStatField] > 0 ){
        if ( $scope.stats[i][displayStatField] >= needed ){
          $scope.stats[i][displayStatField] -= needed;
          $scope.unspentStatPoints[unspentStatField] += needed;
        }
        else {
          $scope.unspentStatPoints[unspentStatField] += $scope.stats[i][displayStatField];
          $scope.stats[i][displayStatField] = 0;
        }
        lowered = true;
      }
    }
  }
  
}

/* If the user adds some general skills to the character and then adds a lifepath that has those skills,
   then those skills should be removed from the general list, and the points spent on them refunded. */
function removeLifepathSkillsFromGeneralSkills($scope){
  for(var key in $scope.lifepathSkills){
    if ( key in $scope.generalSkills ){
      var displaySkill = $scope.generalSkills[key];
      $scope.unspentStatPoints.physical += displaySkill.physicalPointsSpent;
      $scope.unspentStatPoints.mental += displaySkill.mentalPointsSpent;
      $scope.unspentStatPoints.either += displaySkill.eitherPointsSpent;
      delete $scope.generalSkills[key]
    }
  }
}

function calculateLifepathTraits($scope, burningData){
  var lifepathTraits = {};
  var totalTraitPoints = 0;

  for(var i = 0; i < $scope.selectedLifepaths.length; i++){
    var displayLp = $scope.selectedLifepaths[i];
    
    totalTraitPoints += displayLp.traitPts;

    for(var j = 0; j < displayLp.traits.length; j++){
      var name = displayLp.traits[j];
      
      lifepathTraits[name] = new DisplayTrait(name, burningData.traits);
    } 
  }

  $scope.lifepathTraits = lifepathTraits;
  $scope.totalTraitPoints = totalTraitPoints;
  $scope.unspentTraitPoints = totalTraitPoints;
}

function setCommonTraits($scope, burningData){
  var commonTraits = {}

  if( $scope.selectedLifepaths.length == 0 )
    return;

  var common = $scope.selectedLifepaths[0].commonTraits;
  if(common.length > 0){
    for(var j = 0; j < common.length; j++){
      var name = common[j];
      commonTraits[name] = new DisplayTrait(name, burningData.traits);
    }
  }
  $scope.commonTraits = commonTraits;
}

function purchaseRequiredTraits($scope, burningData){
  var requiredTraits = {};
  var unspentTraitPoints = $scope.unspentTraitPoints;

  var required = traitsRequiredToBeOpened($scope.selectedLifepaths);

  for(name in required){
    requiredTraits[name] = new DisplayTrait(name, burningData.traits);
    unspentTraitPoints -= 1;
  }

  $scope.unspentTraitPoints = unspentTraitPoints;
  $scope.requiredTraits = requiredTraits;
}

function addBrutalLifeRequiredTraits($scope, burningData){
  for(var i = 0; i < $scope.selectedLifepaths.length; i++){
    var lp = $scope.selectedLifepaths[i];
    if( lp.brutalLifeTraitName ){
      var trait = new DisplayTrait(lp.brutalLifeTraitName, burningData.traits);
      $scope.requiredTraits[lp.brutalLifeTraitName] = trait;
    }
  }
}

/*
  Return a hash of trait names that are required to be open
  due to lifepaths.
*/
function traitsRequiredToBeOpened(lifepaths){
  var traitHash = {};
  for(var i = 0; i < lifepaths.length; i++){
    for(var j = 0; j < lifepaths[i].traits.length; j++){
      var traitName = lifepaths[i].traits[j];
      if ( ! (traitName in traitHash) ){
        traitHash[traitName] = 1;
        break;
      }
    }
  } 

  return traitHash;
}

function calculateUnspentTraitPoints($scope){
  var unspentTraitPoints = $scope.totalTraitPoints;

  var required = hashValues($scope.requiredTraits);
  unspentTraitPoints -= required.length;

  var purchased = hashValues($scope.purchasedTraits);
  for(var i = 0; i < purchased.length; i++){
    var trait = purchased[i];
    if ( trait.name in $scope.lifepathTraits ){
      unspentTraitPoints -= 1;
    } else {
      unspentTraitPoints -= trait.cost;
    }
  }
  $scope.unspentTraitPoints = unspentTraitPoints;

}



/*
  rexpr are the requires_expr. Returns a two-element list. 
  The first element is true if the requirements are satisifed, false 
  otherwise. The second element are any extra conditions if the first 
  element is true. These extra conditions semantically descibe extra conditions
  that must _later_ be met, for example "the requirements are satisfied as long as 
  the character takes the trait 'your grace' "

  The extra conditions supported so far are only a list of trait names.
*/
function areLifepathRequirementsSatisfied($scope, rexpr){
 
  // make lookup tables
  var selectedLifepathsByName = {}
  for(var i = 0; i < $scope.selectedLifepaths.length; i++) {
    selectedLifepathsByName[$scope.selectedLifepaths[i].name.toLowerCase()] = true;
  }
  var selectedLifepathsBySettingAndName = {}
  for(var i = 0; i < $scope.selectedLifepaths.length; i++) {
    selectedLifepathsBySettingAndName[$scope.selectedLifepaths[i].setting.toLowerCase() + ":" + $scope.selectedLifepaths[i].name.toLowerCase()] = true;
  }
  

  var checkHasLifepathIn = function(rexpr){
    // This is a [+has_lifepath_in, lp1, lp2, ...] OR [lifepath, lifepath] array.
    for(var i = 0; i < rexpr.length; i++){
      var s = rexpr[i]

      if(i == 0 && s.substring(0,1) == "+")
        continue;

      // Does the requirement list the required lifepath as setting:name or just name?
      if( s.indexOf(":") < 0 ){
        if( selectedLifepathsByName[s] )
          return [true,[]];
      }
      else {
        if( selectedLifepathsBySettingAndName[s] )
          return [true,[]];
      }
    }
    return [false,[]];
  }

  var checkHasSex = function(rexpr){
    if (rexpr.length < 2){
      console.log("Error in areLifepathRequirementsSatisfied when evaluating expression: sex predicate is length < 2 when it must be 2");
      return [false, []];
    }
    return [rexpr[1].toLowerCase() == $scope.gender.toLowerCase(), []];
  }

  var checkHasNLifepathsIn = function(rexpr){
    if (rexpr.length < 3){
      console.log("Error in areLifepathRequirementsSatisfied when evaluating expression: has_n_lifepaths_in predicate is length < 3 when it must be 3");
      return [false, []];
    }

    var requiredCount = rexpr[1];
    var actualCount = 0;
    for(var i = 0; i < $scope.selectedLifepaths.length; i++){
      var lifepath = $scope.selectedLifepaths[i]
      for(var j = 2; j < rexpr.length; j++){
        var s = rexpr[j]
        // Does the requirement list the required lifepath as setting:name or just name?
        var lpName = null;
        if( s.indexOf(":") < 0 ){
          // simple name
          lpName = lifepath.name.toLowerCase();
        } else {
          lpName = lifepath.setting.toLowerCase() + ":" + lifepath.name.toLowerCase();
        }

        if(lpName == s){
          actualCount += 1;
          break;
        }
      }
    }

    return [actualCount >= requiredCount, []];
  }

  var checkHasNLifepathsOrMore = function(rexpr){
    if (rexpr.length < 2){
      console.log("Error in areLifepathRequirementsSatisfied when evaluating expression: has_n_lifepaths_or_more predicate is length < 2 when it must be 2");
      return [false, []];
    }

    return [$scope.selectedLifepaths.length >= rexpr[1], []];
  }

  var checkHasNLifepathsOrLess = function(rexpr){
    if (rexpr.length < 2){
      console.log("Error in areLifepathRequirementsSatisfied when evaluating expression: has_n_lifepaths_or_less predicate is length < 2 when it must be 2");
      return [false, []];
    }

    return [$scope.selectedLifepaths.length <= rexpr[1], []];
  }

  var checkAgeLessThan = function(rexpr){
    if (rexpr.length < 2){
      console.log("Error in areLifepathRequirementsSatisfied when evaluating expression: age_less_than predicate is length < 2 when it must be 2");
      return [false, []];
    }
    
    return [$scope.age < rexpr[1], []];
  }

  var checkAgeGreaterThan = function(rexpr){
    if (rexpr.length < 2){
      console.log("Error in areLifepathRequirementsSatisfied when evaluating expression: age_greater_than predicate is length < 2 when it must be 2");
      return [false, []];
    }
    
    return [$scope.age > rexpr[1], []];
  }

  var checkTrait = function(rexpr){
    if (rexpr.length < 2){
      console.log("Error in areLifepathRequirementsSatisfied when evaluating expression: trait predicate is length < 2 when it must be 2");
      return [false, []];
    }

    return [true, [rexpr[1]]]
  }

  var checkExpr = function(type, rexpr){
    if ( type != "or" && type != "and" ){
      console.log("Error in areLifepathRequirementsSatisfied when evaluating expression: checkExpr called with neither 'or' nor 'and'");
      return [false, []];
    }

    if (rexpr.length < 2){
      console.log("Error in areLifepathRequirementsSatisfied when evaluating expression: '"+type+"' expression is length < 2 when it must be 2 or more");
      return [false, []];
    }

    var result;
    if ( type == "or" ){
      result = false;
    } else {
      result = true;
    }

    var conditions = [];
    for(var i = 1; i < rexpr.length; i++){
      // Each element in an expression is itself an expression or a predicate.
      var newRexpr = rexpr[i];
      var evalResult = areLifepathRequirementsSatisfied($scope, newRexpr);

      if ( type == "or" ){
        if ( evalResult[0] ){
          result = true;
          conditions = evalResult[1];
          break;
        }
      } else {
        // and
        if ( ! evalResult[0] ){
          result = false;
          break;
        }
        // Append any returned conditions in newRexpr.
        for(var j = 0; j < evalResult[1].length; j++){
          conditions.push(evalResult[1][j]);
        }
      }
    }

    if ( ! result ){
      conditions = [];
    }

    return [result, conditions];
  }

  var checkNotExpr = function(rexpr){
    if (rexpr.length != 2){
      console.log("Error in areLifepathRequirementsSatisfied when evaluating expression: '"+type+"' expression is length "+rexpr.length+" when it must exactly 2");
      return [false, []];
    }
  
    var evalResult = areLifepathRequirementsSatisfied($scope, rexpr[1]);

    return [!evalResult[0], evalResult[1]];
  }

  // evaluate expression
  if ( rexpr.length < 1 ){
    console.log("Error in areLifepathRequirementsSatisfied when evaluating expression: expression is length 0!");
    return [false,[]];
  }

  var type = rexpr[0]
  if( type == "+has_lifepath_in" || type.substring(0,1) != "+"){
    return checkHasLifepathIn(rexpr);
  } else if( type == "+sex"){
    return checkHasSex(rexpr);
  } else if( type == "+has_n_lifepaths_in"){
    return checkHasNLifepathsIn(rexpr);
  } else if( type == "+has_n_lifepaths_or_more"){
    return checkHasNLifepathsOrMore(rexpr);
  } else if( type == "+has_n_lifepaths_or_less"){
    return checkHasNLifepathsOrLess(rexpr);
  } else if( type == "+age_less_than"){
    return checkAgeLessThan(rexpr);
  } else if( type == "+age_greater_than"){
    return checkAgeGreaterThan(rexpr);
  } else if( type == "+trait"){
    return checkTrait(rexpr);
  } else if( type == "+and"){
    return checkExpr("and", rexpr)
  } else if( type == "+or"){
    return checkExpr("or", rexpr);
  } else if( type == "+not"){
    return checkNotExpr(rexpr);
  } else {
    console.log("No support for lifepath requirement expression " + type);
    return [false,[]];
  }
}

function weaponSkillsNames(){
  return ["Axe", "Bow", "Cudgel", "Crossbow", "Firearms", "Firebombs", "Hammer", "Knives", "Lance", "Mace", "Polearm", "Spear", "Staff", "Sword"]
}

// Perform some simple validation on the char struct to ensure it seems mostly legit.
function characterStructValid(charStruct){
  if(!("serialize_version" in charStruct))
    return false;
  if(!("name" in charStruct))
    return false;
  if(!("gender" in charStruct))
    return false;
  if(!("stock" in charStruct))
    return false;
  if(!("lifepaths" in charStruct))
    return false;
  if(!("stats" in charStruct))
    return false;
  if(!("skills" in charStruct))
    return false;
  if(!("traits" in charStruct))
    return false;
  if(!("gear" in charStruct))
    return false;
  if(!("property" in charStruct))
    return false;
  if(!("relationships" in charStruct))
    return false;
  if(!("reputations" in charStruct))
    return false;
  if(!("affiliations" in charStruct))
    return false;

  return true;
}

function calculateTraitWarnings($scope, burningData){
 
  // Make lookup maps of traits using lower-case trait names
  var allTakenTraitNames = {};
  for(var key in $scope.purchasedTraits){
    allTakenTraitNames[key.toLowerCase()] = 1;
  }
  for(var key in $scope.requiredTraits){
    allTakenTraitNames[key.toLowerCase()] = 1;
  }

  var traitWarnings = [];
  for(var i = 0; i < $scope.selectedLifepaths.length; i++){
    var selectedLifepath = $scope.selectedLifepaths[i];

    // Check the requirements for this lifepath to see if there are extra conditions.
    var rexpr = burningData.lifepaths[$scope.stock][selectedLifepath.setting][selectedLifepath.name].requires_expr

    if(rexpr){

      var result = areLifepathRequirementsSatisfied($scope, rexpr);
      for(var k = 0; k < result[1].length; k++){
        var trait = result[1][k];
  
        if( ! (trait in allTakenTraitNames) ){
          traitWarnings.push("You must take the '"+trait+"' trait to satisfy the '"+selectedLifepath.name+"' lifepath requirements.");
        }
      }
    }
  }

  $scope.lifepathTraitWarnings = traitWarnings;
}

function applyBonusesFromTraits($scope) {
  var traitBonuses = new TraitBonuses();

  //**** Calculate bonuses
  for(var key in $scope.purchasedTraits){
    var displayTrait = $scope.purchasedTraits[key];
    traitBonuses.addTrait(key, displayTrait);
  } 

  for(var key in $scope.requiredTraits){
    var displayTrait = $scope.requiredTraits[key];
    traitBonuses.addTrait(key, displayTrait);
  } 

  for(var key in $scope.commonTraits){
    var displayTrait = $scope.commonTraits[key];
    traitBonuses.addTrait(key, displayTrait);
  }


  //**** Apply bonuses

  //** Skills

  for(var key in $scope.lifepathSkills) {
    var displaySkill = $scope.lifepathSkills[key];
    displaySkill.bonus = traitBonuses.getAddBonusesForSkill(key);
    displaySkill.roundUp = traitBonuses.getRoundUpBonusForSkill(displaySkill);
  }  

  for(var key in $scope.generalSkills) {
    var displaySkill = $scope.generalSkills[key];
    displaySkill.bonus = traitBonuses.getAddBonusesForSkill(key);
    displaySkill.roundUp = traitBonuses.getRoundUpBonusForSkill(displaySkill);
  }  


  //** Attributes
  var attrNames = $scope.attributeNames();
  for(var i = 0; i < attrNames.length; i++) {
    var attrName = attrNames[i];
    $scope.attributeBonuses[attrName] = traitBonuses.getAddBonusesForAttr(attrName);
  }

  //** Stats
  for(var i = 0; i < $scope.stats.length; i++) {
    var statName = $scope.stats[i].name;
    $scope.stats[i].bonus = traitBonuses.getAddBonusesForStat(statName);
  }

}

/*
  Compute which traits the user can add as special traits. This value depends on character stock so 
  this function should be called when stock changes.
*/
function calculateSpecialTraitsForDisplay($scope, burningData){
  var list = [];

  for(var traitName in burningData.traits) {
    var trait = burningData.traits[traitName];

    if ('restrict' in trait){
      if ( trait.restrict.indexOf(validStockToRestrictionStock($scope.stock)) >= 0 &&  
        (trait.restrict.indexOf("special") >= 0 || trait.restrict.indexOf("character") >= 0) ){
        list.push(new DisplayTrait(traitName, burningData.traits));
      }
    } else {
      // No restriction! As long as cost > 0 (cost 0 is for traits with no cost; not purchaseable)
      if ( trait.cost > 0 ) {
        list.push(new DisplayTrait(traitName, burningData.traits));
      }
    }
  }

  if(list.length > 0 && list.indexOf($scope.currentSpecialTrait) < 0 ){
    $scope.currentSpecialTrait = list[0];
  }
  $scope.specialTraitsForDisplay = list;
}

function calculateTotalResourcePoints($scope){
  var totalResourcePoints = 0;

  for(var i = 0; i < $scope.selectedLifepaths.length; i++){
    var displayLp = $scope.selectedLifepaths[i];
    totalResourcePoints += displayLp.resourcePts;
  }

  $scope.totalResourcePoints = totalResourcePoints;
}

function calculateUnspentResourcePoints($scope){
  var unspentResourcePoints = $scope.totalResourcePoints;

  var reduce = function(vals){
    for(var i = 0; i < vals.length; i++){
      var display = vals[i];
      unspentResourcePoints -= display.cost;
    }
  }

  reduce(hashValues($scope.relationships));
  reduce(hashValues($scope.gear));
  reduce(hashValues($scope.property));
  reduce(hashValues($scope.affiliations));
  reduce(hashValues($scope.reputations));

  $scope.unspentResourcePoints = unspentResourcePoints;
}

function isValidStock(stock){
  return stock == "man" || stock == "elf" || stock == "orc" || stock == "dwarf" || stock == "roden" || stock == "wolf" || stock =="troll";
}

function restrictionStockToValidStock(stock){

  if ( stock == "mannish" )
    return "man";
  else if ( stock == "elven" )
    return "elf";
  else if ( stock == "orcish" )
    return "orc";
  else if ( stock == "dwarven" )
    return "dwarf";
  else if ( stock == "wolfish" )
    return "wolf";
  else if ( stock == "roden" )
    return "roden";
  else if ( stock == "trollish" )
    return "troll";
}

function validStockToRestrictionStock(stock){

  if ( stock == "man" )
    return "mannish";
  else if ( stock == "elf" )
    return "elven";
  else if ( stock == "orc" )
    return "orcish";
  else if ( stock == "dwarf" )
    return "dwarven";
  else if ( stock == "roden" )
    return "roden";
  else if ( stock == "wolf" )
    return "wolfish";
  else if ( stock == "troll" )
    return "trollish";
}

function attributeModifyingQuestions($scope, attribute)
{ 
  var result = [];

  var ageMod = function(age){
    return function(){
      return ($scope.age > age ? 1 : 0);
    }
  }

  if ( attribute == "Greed" )
  {
    var willMod = function(){
      return ($scope.statsByName["Will"].exp() <= 4 ? 1 : 0);
    }

    var resMod = function(){
      return Math.floor($scope.totalResourcePoints/60);
    }

    var twohundredMod = function(){
      return ($scope.age > 200 ? 1 : 0);
    }

    var fourhundredMod = function(){
      return ($scope.age > 400 ? 1 : 0);
    }

    var lpMod = function(){
      var greedyLps = {"trader":1, "mask bearer":1, "master of arches":1, "master of forges":1, "master engraver":1, "treasurer":1, "quartermaster":1, "seneschal":1, "prince":1 }

      var greed = 0;
      for(var i = 0; i < $scope.selectedLifepaths.length; i++){
        if($scope.selectedLifepaths[i].name.toLowerCase() in greedyLps){
          greed++;
        }
      }

      return greed;
    }

    var relMod = function(){
      var greed = 0;

      var rels = hashValues($scope.relationships);
      for(var i = 0; i < rels.length; i++){
        if ( rels[i].isHateful ){
          greed++;
          if ( rels[i].isImmedFam )
            greed++;
        }
        else if ( rels[i].isRomantic ) {
          greed--;
        }
      }

      return greed;
    }

    result.push(
      {question: "+1 Greed if Will exponent is 4 or lower.", computed: true, compute: willMod},
      {question: "+1 Greed for every 60 resource points.", computed: true, compute: resMod},
      {question: "+1 Greed for each of the following lifepaths: Trader, Mask-Bearer, Master of Arches, Master of Forges, Master Engraver, Treasurer, Quartermaster, Seneschal or Prince.", computed: true, compute: lpMod},
      {question: "Has your character coveted something owned by another?", math_label: "(+1 Greed)", modifier: 1},
      {question: "Has your character ever stolen something he coveted?", math_label: "(+1 Greed)", modifier: 1},
      {question: "Has your character ever had his prized treasure stolen from him?", math_label: "(+1 Greed)", modifier: 1},
      {question: "Has your character ever been in the presence of the master craftsmanship of the Dwarven Fathers?", math_label: "(+1 Greed)", modifier: 1},
      {question: "Has your character witnessed an outsider (Elf, Man, Orc, Roden, etc.) in possession of a work of Dwarven Art?", math_label: "(+1 Greed)", modifier: 1},
      {question: "+1 Greed if the character is over 200 years old.", computed: true, compute: ageMod(200)},
      {question: "+1 Greed if the character is over 400 years old.", computed: true, compute: ageMod(400)},
      {question: "Each romantic relationship is -1 Greed. Each hateful relationship is +1 Greed. A hateful immediate family member is +2 Greed.", computed: true, compute: relMod}
    ); 
  } 
  else if ( attribute == "Health" )
  {
    var stockMod = function(){
      return ($scope.stock == "orc" || $scope.stock == "dwarf" || $scope.stock == "elf" ? 1 : 0);
    }

    result.push(
      {question: "Does the character live in squalor and filth?", math_label: "(-1 Health)", modifier: -1},
      {question: "Is the character frail or sickly?", math_label: "(-1 Health)", modifier: -1},
      {question: "Was the character severely wounded in the past?", math_label: "(-1 Health)", modifier: -1},
      {question: "Has the character been tortured and enslaved?", math_label: "(-1 Health)", modifier: -1},
      {question: "+1 Health if the character is a Dwarf, Elf, or Orc.", computed: true, compute: stockMod},
      {question: "Is the character athletic and active?", math_label: "(+1 Health)", modifier: 1},
      {question: "Does the character live in a really clean and happy place, like the hills in the Sound of Music?", math_label: "(+1 Health)", modifier: 1}
    );
  }
  else if ( attribute == "Steel" )
  {
    var lpMod = function()
    {
      //  "herald":1, "bannerman":1, "scout":1, "sergeant":1, "veteran":1, "cavalryman":1, "captain":1, "military order":1}
      var steelyLps = {"conscript":1, "squire":1, "knight":1, "bandit":1, "pirate":1, "military order":1, "sword singer":1};
      var steelySettings = {"professional soldier subsetting":1, "black legion subsetting":1, "dwarven host subsetting":1, "protector subsetting":1};
      
      var steel = 0;
      for(var i = 0; i < $scope.selectedLifepaths.length; i++){
        if($scope.selectedLifepaths[i].name.toLowerCase() in steelyLps || $scope.selectedLifepaths[i].setting.toLowerCase() in steelySettings){
          steel = 1;
          break;
        }
      }

      return steel;
    }

    var woundMod = function()
    {
      if( lpMod() > 0 ){
        return 1;
      }
      else
      {
        return -1;
      }
    }

    var tortureMod = function()
    {
      var will = $scope.statsByName['Will'].exp();
      if( will > 4 )
        return 1;
      else if ( will < 4 )
        return -1;
      else
        return 0;
    }

    var traitMod = function()
    {
      return ($scope.hasTrait("Gifted") || $scope.hasTrait("Faithful") ? 1 : 0);
    }

    var percMod = function()
    {
      return ($scope.statsByName['Perception'].exp() >= 6 ? 1 : 0);
    }

    var willMod = function()
    {
      var will = $scope.statsByName['Will'].exp();
      var mod = 0;
      if( will > 5 )
        mod++;
      if( will > 7 )
        mod++;
      return mod;
    }

    var forteMod = function()
    {
      return ($scope.statsByName['Forte'].exp() >= 6 ? 1 : 0);
    }

    result.push(
      {question: "+1 Steel if the character taken a conscript, soldier, bandit, squire or knight type lifepath.", computed: true, compute: lpMod},
      {question: "Has the character ever been severely wounded?", math_label: "(+1 Steel if combat lifepath taken/-1 Steel if not)", computeModifier: true, compute: woundMod},
      {question: "Has the character ever murdered or killed with his own hand more than once?", math_label: "(+1 Steel)", modifier: 1},
      {question: "Has the character been tortured, enslaved or beaten terribly over time?", math_label: "(+1 Steel if Will is > 4, -1 Steel if Will < 4, +0 if Will is 4)", computeModifier: true, compute: tortureMod},
      {question: "Has the character lead a sheltered life, free of violence and pain?", math_label: "(-1 Steel)", modifier: -1},
      {question: "Has the character been raised in a competitive (but non-violent) culture - sports, debate, strategy games, courting?", math_label: "(+1 Steel)", modifier: 1},
      {question: "Has the character given birth to a child?", math_label: "(+1 Steel)", modifier: 1},
      {question: "+1 Steel if the character Gifted, Faithful or an equivalent.", computed: true, compute: traitMod},
      {question: "+1 Steel if the character's Perception exponent is 6 or higher.", computed: true, compute: percMod},
      {question: "+1 Steel if the character's Will exponent is 5 or higher; an additional +1 if it's 7 or higher.", computed: true, compute: willMod},
      {question: "+1 Steel if the character's Forte exponent is 6 or higher.", computed: true, compute: forteMod}
    );
  }
  else if ( attribute == "Health" )
  {
    var stockMod = function(){
      return ($scope.stock == "orc" || $scope.stock == "dwarf" || $scope.stock == "elf" ? 1 : 0);
    }

    result.push(
      {question: "Does the character live in squalor and filth?", math_label: "(-1 Health)", modifier: -1},
      {question: "Is the character frail or sickly?", math_label: "(-1 Health)", modifier: -1},
      {question: "Was the character severely wounded in the past?", math_label: "(-1 Health)", modifier: -1},
      {question: "Has the character been tortured and enslaved?", math_label: "(-1 Health)", modifier: -1},
      {question: "+1 Health if the character is a Dwarf, Elf, or Orc.", computed: true, compute: stockMod},
      {question: "Is the character athletic and active?", math_label: "(+1 Health)", modifier: 1},
      {question: "Does the character live in a really clean and happy place, like the hills in the Sound of Music?", math_label: "(+1 Health)", modifier: 1}
    );
  }
  else if ( attribute == "Grief" )
  {
    var protectMod = function(){
      var grief = 0;
      for(var i = 0; i < $scope.selectedLifepaths.length; i++){
        if($scope.selectedLifepaths[i].setting.toLowerCase() == "protector subsetting"){
          grief = 1;
          break;
        }
      }

      return grief;
    }

    var lpMod1 = function(){
      var lps = {"lancer":1, "lieutenant":1, "captain":1};
      var lps2 = {"lord protector":1, "soother":1};
      
      var grief1 = 0;
      var grief2 = 0;
      for(var i = 0; i < $scope.selectedLifepaths.length; i++){
        if($scope.selectedLifepaths[i].name.toLowerCase() in lps)
        {
          grief1 = 1;
          if( grief2 > 0) 
            break;
        }
        if($scope.selectedLifepaths[i].name.toLowerCase() in lps2)
        {
          grief2 = 1;
          if( grief1 > 0) 
            break;
        }
      } 

      return grief1 + grief2;
    }

    var etharchMod = function(){
      for(var i = 0; i < $scope.selectedLifepaths.length; i++){
        if($scope.selectedLifepaths[i].name.toLowerCase() == "born etharch"){
          return 1;
        }
      }

      return 0;
    }

    var lpMod2 = function(){
      var lps = {"loremaster":1, "adjutant":1, "althing":1};
      
      for(var i = 0; i < $scope.selectedLifepaths.length; i++){
        if($scope.selectedLifepaths[i].name.toLowerCase() in lps)
          return 1;
      } 

      return 0;
    }

    var elderMod = function(){
      for(var i = 0; i < $scope.selectedLifepaths.length; i++){
        if($scope.selectedLifepaths[i].name.toLowerCase() == "elder"){
          return 1;
        }
      }

      return 0;
    }

    var lamentMod = function(){
      var skills = $scope.allSelectedSkills();
      for(key in skills)
      {
        var skill = skills[key];
        // Dark Elves have no laments, therefore we check if the skill is a lament BEFORE we calculate
        // the exponent because we don't want to it to get sent into an infinite loop, i.e.
        // calculate spite -> calc grief -> calc spite skill exponent -> spite -> grief -> ...
        if( beginsWith(key.toLowerCase(), "lament") && skill.exp($scope.statsForSkillCalc) > 0 )
          return 0;
      }
      return 1;
    }

    var steelMod = function(){
      var steel = $scope.attribute('Steel').exp;
      var mod = 0;
      if ( steel > 5 )
        mod = steel - 5;
      return mod;
    }

    var percMod = function(){
      return ($scope.statsByName['Perception'].exp() > 5 ? 1 : 0);
    }
  
    result.push(
      {question: "+1 Grief if the character has taken any Protector lifepath.", computed: true, compute: protectMod},
      {question: "+1 Grief if the character has been a Lancer, Lieutenant or Captain; Additional +1 if the character has been a Lord Protector or Soother", computed: true, compute: lpMod1},
      {question: "+1 Grief if the character was Born Etharch", computed: true, compute: etharchMod},
      {question: "+1 Grief if the character has been a Loremaster, Adjutant or Althing", computed: true, compute: lpMod2},
      {question: "+1 Grief if the character has taken the Elder lifepath", computed: true, compute: elderMod},
      {question: "+1 Grief if the character doesn't know any Lamentations", computed: true, compute: lamentMod},
      {question: "Does the character's history include tragedy?", math_label: "(+1 Grief)", modifier: 1},
      {question: "Has the character lived among non-Elven people?", math_label: "(+1 Grief)", modifier: 1},
      {question: "+1 Grief for each point of Steel above 5.", computed: true, compute: steelMod},
      {question: "+1 Grief if the characters Perception is above 5.", computed: true, compute: percMod},
      {question: "+1 Grief if the character is over 500 years old.", computed: true, compute: ageMod(500)},
      {question: "+1 Grief if the character is over 750 years old.", computed: true, compute: ageMod(750)},
      {question: "+1 Grief if the character is over 1000 years old.", computed: true, compute: ageMod(1000)}
    );
  }
  else if ( attribute == "Spite" )
  {
    var griefMod = function() {
      var grief = $scope.attribute("Grief").exp
      return grief;
    }

    var traitsMod = function(){
      var val = 0;
      if($scope.hasTrait('Slayer'))
        val++;
      if($scope.hasTrait('Exile'))
        val++;
      if($scope.hasTrait('Feral'))
        val++;
      if($scope.hasTrait('Murderous'))
        val++;
      if($scope.hasTrait('Saturnine'))
        val++;
      if($scope.hasTrait('Femme Fatale/Homme Fatale'))
        val++;
      if($scope.hasTrait('Cold'))
        val++;
      if($scope.hasTrait('Bitter'))
        val++;
      return val;
    }

    var bitterMod = function() {
      var darkElfGear = [
        'Bitter Poison',
        'Spiteful Poison',
        'Lock Picks',
        'Long Knife',
        'Barbed Javelins',
        'Garrote',
        'Caltrops',
        'Tools Of The Trade',
        'Cloak Of Darkness',
        'Climbing Claws',
        'Remote Refuge',
        'Morlin Armor',
        'Morlin Weapons'
      ]
      var bitterRps = 0;

      var isBitter = function(gear) {
        for (var i = 0; i < darkElfGear.length; i++) {
          if (gear.desc.startsWith(darkElfGear[i])) {
            return false;
          }
        }
        return true;
      }

      for (var k in $scope.gear) {
        var gear = $scope.gear[k];
        if (isBitter(gear)) {
          bitterRps += gear.cost;
        }
      }

      for (var k in $scope.property) {
        var prop = $scope.property[k];
        if (isBitter(prop)) {
          bitterRps += prop.cost;
        }
      }

      return Math.floor(bitterRps/10);
    }

    result.push(
      {question: "+1 Spite for every point of Grief", computed: true, compute: griefMod},
      {question: "+1 Spite for each of several spiteful traits", computed: true, compute: traitsMod},
      {question: "+1 Spite for every 10 rps spent on Elven resources", computed: true, compute: bitterMod},
      {question: "Has the character been betrayed by their friends?", math_label: "(+1 Spite)", modifier: 1},
      {question: "Is the character lovesick or broken hearted?", math_label: "(+1 Spite)", modifier: 1},
      {question: "Has the character been abandoned by those they held dear?", math_label: "(+1 Spite)", modifier: 1},
      {question: "Has the character been abused or tortured?", math_label: "(+1 Spite)", modifier: 1},
      {question: "Does the character still respect or admire someone on the other side?", math_label: "(-1 Spite)", modifier: -1},
      {question: "Does the character still love someone on the other side?", math_label: "(-2 Spite)", modifier: -2}

    );
  }
  else if ( attribute == "Hatred" )
  {
    var brutalMod = function(){
      var count = 0;
      for(var i = 0; i < $scope.selectedLifepaths.length; i++){
        if ( $scope.selectedLifepaths[i].brutalLifeTraitName ){ 
          count++;
        }
      }
      return count;
    }

    var willMod = function()
    {
      var will = $scope.statsByName['Will'].exp();
      return (will <= 2 ? 1 : 0);
    }

    var steelMod = function(){
      var steel = $scope.attribute('Steel').exp;
      return (steel >= 5 ? 1 : 0);
    }

    var percMod = function(){
      return ($scope.statsByName['Perception'].exp() >= 6 ? 1 : 0);
    }

    var traitsMod = function(){
      var val = 0;
      if($scope.hasTrait('Kicking The Beast'))
        val++;
      if($scope.hasTrait('Yowling'))
        val++;
      if($scope.hasTrait("Where There's A Whip, There's A Way"))
        val++;
      if($scope.hasTrait("Charging Blindly"))
        val++;
      if($scope.hasTrait("Cry Of Doom"))
        val++;
      if($scope.hasTrait("Unrelenting Savagery"))
        val++;
      if($scope.hasTrait("Humility"))
        val++;
      if($scope.hasTrait("Life Is Death"))
        val++;
      if($scope.hasTrait("Pain Life"))
        val++;
      if($scope.hasTrait("Intense Hatred"))
        val++;
      if($scope.hasTrait("Silent Hatred"))
        val++;
      if($scope.hasTrait("Savage Consequences"))
        val++;
      if($scope.hasTrait("Unrelenting Hatred"))
        val++;
      if($scope.hasTrait("Naked Hatred"))
        val++;
      return val;
    }

    result.push(
      {question: "Was the character ever horribly wounded?", math_label: "(+1 Hatred)", modifier: 1},
      {question: "+1 Hatred for each 1 rolled on the Brutal Life table.", computed: true, compute: brutalMod},
      {question: "Has the character been tortured?", math_label: "(+1 Hatred)", modifier: 1},
      {question: "Has the character ever been a slave to another?", math_label: "(+1 Hatred)", modifier: 1},
      {question: "Has the character ever killed his superior or parents?", math_label: "(+1 Hatred)", modifier: 1},
      {question: "Has the character ever attempted to command a unit of goblins in battle?", math_label: "(+1 Hatred)", modifier: 1},
      {question: "+1 Hatred if the character's Will is 2 or lower", computed: true, compute: willMod},
      {question: "+1 Hatred if the character's Steel is 5 or higher", computed: true, compute: steelMod},
      {question: "+1 Hatred if the character's Perception is 6 or higher", computed: true, compute: percMod},
      {question: "+1 Hatred for each of several hatred-related traits", computed: true, compute: traitsMod}
    );
  }
  else if ( attribute == "Faith" )
  {
    result.push(
      {question: "Is God who you trust the most?", math_label: "(+1 Faith)", modifier: 1},
      {question: "When in danger, do you consult God for aid?", math_label: "(+1 Faith)", modifier: 1},
      {question: "Is it only through God that you best serve your allies?", math_label: "(+1 Faith)", modifier: 1}
    );
  }
  else if ( attribute == "Ancestral Taint" )
  {
    var skills = $scope.allSelectedSkills();

    var primalBarkMod = function() {
      return ("Primal Bark" in skills) ? 1 : 0;
    }

    var ancestralJawMod = function() {
      return ("Ancestral Jaw" in skills) ? 1 : 0;
    }

    var grandfathersSongMod = function() {
      return ("Grandfather's Song" in skills) ? 1 : 0;
    }

    var stinkOfAncientsMod = function() {
      return ($scope.hasTrait("Stink Of The Ancient") ? 1 : 0);
    }

    var spiritNoseMod = function() {
      return ($scope.hasTrait("Spirit Nose") ? 1 : 0);
    }

    result.push(
      {question: "+1 Ancestral Taint if the character has the Primal Bark skill", computed: true, compute: primalBarkMod},
      {question: "+1 Ancestral Taint if the character has the Ancestral Jaw skill", computed: true, compute: ancestralJawMod},
      {question: "+1 Ancestral Taint if the character has the Grandfather's Song skill", computed: true, compute: grandfathersSongMod},
      {question: "+1 Ancestral Taint if the character has the Stink Of The Ancients trait", computed: true, compute: stinkOfAncientsMod},
      {question: "+1 Ancestral Taint if the character has the Spirit Nose trait", computed: true, compute: spiritNoseMod}
    );
  }
  else {
    //console.log("Error: attribute "+attribute+" doesn't have any modifying questions");
    return null;
  }
  return result;
}

function convertAttributeModifierQuestionResultsForSave($scope){
  // Save only the non-computed questions that were answered.

  var result = {};
 
  for (key in $scope.attributeModifierQuestionResults){
    var list = [];

    var questions = $scope.attributeModifierQuestionResults[key];
    for(var i = 0; i < questions.length; i++){
      var q = questions[i];
      if ( ("answer" in q) && (!q.computed)){
        list.push({question: q.question, answer: q.answer});
      }
    }

    result[key] = list;
  }

  return result;
}

function convertAttributeModifierQuestionResultsForCharsheet($scope){
  // Save only the non-computed questions, and generate the questions for all attributes.
  var result = {};

  var questions = $scope.attributeModifierQuestionResults;

  // Generate the full set of questions for each attribute the user actually has.
  var attributeNames = $scope.attributeNames();
  for(var j = 0; j < attributeNames.length; j++){
    var attribute = attributeNames[j];

    var fullQuestions = attributeModifyingQuestions($scope, attribute)
      
    if(! fullQuestions){
      // Not an attribute with questions
      continue;
    }

    var answerHash = {};
    var answers = questions[attribute];
    if(answers){
      for(var i = 0; i < answers.length; i++){
        answerHash[answers[i].question] = answers[i].answer;
      }
    }

    var resultQuestions = [];

    for(var i = 0; i < fullQuestions.length; i++){
      var q = fullQuestions[i];

      if ( q.computed )
        continue;

      if(q.question in answerHash){
        q.answer = answerHash[q.question];
      }

      resultQuestions.push(q);
    }

    result[attribute] = resultQuestions;
  }

  return result;
}

function loadAttributeModifierQuestionResultsFromSave($scope, questions)
{
  var result = {};

  // For each attribute for which questions were saved, generate the 
  // full set of questions, then add in the answers from the save.
  // The reason we do this rather than save all questions and answers
  // is 1) to save space, and 2) because we can't save the compute function
  // to the server, so it needs to be added on load anyhow.
  for(attribute in questions){
    var fullQuestions = attributeModifyingQuestions($scope, attribute)

    var answers = questions[attribute];
    var answerHash = {};
    for(var i = 0; i < answers.length; i++){
      answerHash[answers[i].question] = answers[i].answer;
    }

    for(var i = 0; i < fullQuestions.length; i++){
      var q = fullQuestions[i];
      if(q.question in answerHash){
        q.answer = answerHash[q.question];
      }
    }

    result[attribute] = fullQuestions;
  }

  return result;
}

/**
A number of skills are not defined because they are a specific instance of a general skill; for example
ancient history is a type of history, and has the same roots. This function returns the parent skill for 
a specific skill.
*/
function getGeneralSkillNameFor(skillName){

  if ( endsWith(skillName, "History") )
    return "History";
  else if( endsWith(skillName, "Doctrine"))
    return "Doctrine";
  else if( endsWith(skillName, "Ritual"))
    return "Ritual";
  else if( skillName == "Flute" || skillName ==  "Drum" || skillName == "Lyre" )
    return "Musical Instrument";
  else if( endsWith(skillName, "Husbandry") )
    return "Animal Husbandry";
  else
    return skillName;
}

// Given n stat names, average the stats taking into account shade. Return the resulting [shade, exp] tuple.
var computeStatAverage = function(statsByName, statNames, roundUp){
  var sum = 0;
  var shade = 'B';
  var allGray = true;
  var stats = [];

  var getShade = function(stat){
    var s = stat.shade;
    if(! s){
      s = stat.calcshade();
    }
    return s;
  }

  if(statNames.length == 1){
    var stat = statsByName[statNames[0]];
    return [getShade(stat), stat.exp()];
  }

  // Convert names to actual DisplayStat structs.
  for(var i = 0; i < statNames.length; i++){
    stats[i] = statsByName[statNames[i]];
  }

  for(var i = 0; i < stats.length; i++){
    if(getShade(stats[i]) == 'B'){
      allGray = false;
      break;
    }
  }

  if(allGray)
    shade = 'G';

  for(var i = 0; i < stats.length; i++){
    if(getShade(stats[i]) == 'G' && !allGray){
      sum += 2;
    }
      
    sum += stats[i].exp();
  }

  var exp = Math.floor( sum / stats.length );
  if ( roundUp ) {
    exp = Math.ceil( sum / stats.length );
  }
  return [shade, exp];

}

function calculateItemsFromList(resources, type){
  var rc = [];
  for(var i = 0; i < resources.length; i++){
    var resource = resources[i];
    if(! resource.type || resource.type == type){
      if(resource.resources){
        rc.push({ "displayName" : resource.name + "...", "name": resource.name, "resources": calculateItemsFromList(resource.resources) });
      }
      else
      {
        rc.push({ "displayName" : resource.name + " (" + resource.rp + " rps)", "name": resource.name, "cost" : resource.rp} );
      }
    }
  }
  return rc;
}

function calculateHierarchyListForSelect($scope, burningData, type) {
  var rc = [];
  var resources = burningData.resources[$scope.stock];

  if(! resources )
  {
    resources = [];
  }

  return calculateItemsFromList(resources, type);

}

function calculateGearSelectionLists($scope, burningData) {
  $scope.currentSelectListGear = [];
  $scope.gearListForSelect = [];
  for(var i = 0; i < 3; i++)
    $scope.currentSelectListGear.push({});
  
  $scope.gearListForSelect[0] = calculateHierarchyListForSelect($scope, burningData, 'gear');
  if($scope.gearListForSelect[0].length > 0)
    $scope.currentSelectListGear[0] = $scope.gearListForSelect[0][0];
  
  $scope.calculateHierarchyListForSelectN($scope.gearListForSelect, $scope.currentSelectListGear, 1);
}

function calculatePropertySelectionLists($scope, burningData) {
  $scope.currentSelectListProperty = [];
  $scope.propertyListForSelect = [];
  for(var i = 0; i < 3; i++)
    $scope.currentSelectListProperty.push({});
  
  $scope.propertyListForSelect[0] = calculateHierarchyListForSelect($scope, burningData, 'property');
  if($scope.propertyListForSelect[0].length > 0)
    $scope.currentSelectListProperty[0] = $scope.propertyListForSelect[0][0];
  
  $scope.calculateHierarchyListForSelectN($scope.propertyListForSelect, $scope.currentSelectListProperty, 1);
}

function populateUiFieldsFromDisplayResource($scope, type, resource) {
  if(type == 'relationship'){
    $scope.currentRelationshipDesc = resource.desc;
    $scope.currentRelationshipImportance = resource.importance;
    $scope.currentRelationshipIsImmedFam = resource.isImmedFam;
    $scope.currentRelationshipIsOtherFam = resource.isOtherFam;
    $scope.currentRelationshipIsRomantic = resource.isRomantic;
    $scope.currentRelationshipIsForbidden = resource.isForbidden;
    $scope.currentRelationshipIsHateful = resource.isHateful;
  }
  else if (type == 'gear'){
    $scope.currentGearCost = resource.cost;
    $scope.currentGearDesc = resource.desc;
  }
  else if (type == 'property'){
    $scope.currentPropertyCost = resource.cost;
    $scope.currentPropertyDesc = resource.desc;
  }
  else if (type == 'affiliation'){
    $scope.currentAffiliationDesc = resource.desc;
    $scope.currentAffiliationImportance = resource.importance;
  }
  else if (type == 'reputation'){
    $scope.currentReputationDesc = resource.desc;
    $scope.currentReputationImportance = resource.importance;
  }
}
