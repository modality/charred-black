
/**** Class Settings (Angular Service) ****/
function Settings() {
  this.enforceLifepathReqts = true;
  this.enforcePointLimits = true;
  this.displayEmotionalMath = false;
}
/**** End Class Settings ****/

/**** Class AppropriateWeaponsService (Angular Service) ****/
function AppropriateWeaponsService($modal, $http) {
  // This class will store a hash which maps lifepath names to a list of 
  // weapons that are appropriate for that lifepath.
  this.appropriateWeapons = {};

  var myself = this;

  this.loadFromServer = function(){
    if(serverSettings.storageType != 'server'){
      return;
    }

    $http.get("/get_approp_weapons/user1", {'timeout': 3000} ).
      success(function(data,status,headers,config){
        if (data){
          myself.appropriateWeapons = data
        }
        console.log("Loaded saved appropriate weapons");
      }).
      error(function(data,status,headers,config){
        console.log("Error: Loading appropriate weapons from server failed: HTTP code " + status + ": " + data);
      });
  }

  this.saveToServer = function(){
    if(serverSettings.storageType != 'server'){
      return;
    }

    var json = angular.toJson(myself.appropriateWeapons, true);
    $http.post("/update_approp_weapons/user1", json).
      success(function(data,status,headers,config){
        console.log("Saved appropriate weapons");
      }).
      error(function(data,status,headers,config){
        console.log("Error: Saving appropriate weapons to server failed: HTTP code " + status + ": " + data);
      });
  }

  this.loadFromServer();

  // Replace the 'Appropriate Weapons' entry on the lifepath with the given list.
  this.replaceAppropriateWeapons = function (displayLp, replacementList){
    var newList = [];
    if ( ! replacementList ){
      // There is no replacement for Appropriate Weapons, so leave it alone.
      return;
    }

    var replacementHash = listToHash(replacementList);

    for(var i = 0; i < displayLp.skills.length; i++){
      var skillName = displayLp.skills[i];
      if(skillName != 'Appropriate Weapons' && ! replacementHash[skillName])
      {
        newList.push(displayLp.skills[i]);
      }
    }
    displayLp.skills = newList.concat(replacementList);
  }

  this.replaceAppropriateWeaponsUsingSaved = function (displayLp){
    this.replaceAppropriateWeapons(displayLp, this.appropriateWeapons[displayLp.name]);
  }

  this.hasAppropriateWeapons = function (displayLp){
    var has = false;
    for(var i = 0; i < displayLp.skills.length; i++){
      if(displayLp.skills[i] == 'Appropriate Weapons')
      {
        has = true;
        break;
      }
    }
    return has;
  }

  var myself = this;

  this.selectAppropriateWeapons = function (displayLp, onSelect){
    if( this.hasAppropriateWeapons(displayLp) ){
      this.selectAppropriateWeaponsByLifepathName(displayLp.name, function(selected){
        myself.replaceAppropriateWeapons(displayLp, selected);

        if ( onSelect ){
          onSelect();
        }
      })
    }
  }

  this.selectAppropriateWeaponsByLifepathName = function (lifepathName, onSelect){
    var modalInstance = $modal.open({
      templateUrl: '/choose_appropriate_weapons_partial',
      controller: AppropriateWeaponsModalCtrl,
      resolve: {
        lifepathName: function () {
          return lifepathName;
        },
        chosen: function () {
          if ( myself.appropriateWeapons[lifepathName] )
            return myself.appropriateWeapons[lifepathName];
          else
            return [];
        }
      }
    });

    modalInstance.result.then(function (selected) {
      console.log("Modal: User selected:");
      console.log(selected);
      myself.appropriateWeapons[lifepathName] = selected;
      myself.saveToServer();
      if ( onSelect ){
        onSelect(selected);
      }
    }, function () {
      console.log("Modal: User cancelled");
    });
  }
}
/**** End Class AppropriateWeaponsService ****/

// Replace the 'Weapon of Choice' entry on the lifepath with the given weapon.
function replaceWeaponOfChoice(displayLp, weapon){
  var newList = [];

  if ( ! weapon ){
    // There is no replacement, so leave it alone.
    return;
  }

  for(var i = 0; i < displayLp.skills.length; i++){
    var skillName = displayLp.skills[i];
    if(skillName != 'Weapon Of Choice' && skillName != weapon)
    {
      newList.push(displayLp.skills[i]);
    }
  }
  newList.push(weapon);
  displayLp.skills = newList;
}

/**** Class WeaponOfChoiceService (Angular Service) ****/
function WeaponOfChoiceService($modal, $http) {

  var myself = this;

  this.hasWeaponOfChoice = function (displayLp){
    var has = false;
    for(var i = 0; i < displayLp.skills.length; i++){
      if(displayLp.skills[i] == 'Weapon Of Choice')
      {
        has = true;
        break;
      }
    }
    return has;
  }
 
  this.selectWeaponOfChoice = function (displayLp, onSelect){
    if( this.hasWeaponOfChoice(displayLp) ){
      this.selectWeaponOfChoiceByModal(displayLp.name, function(selected){
        displayLp.weaponOfChoice = selected;
        replaceWeaponOfChoice(displayLp, selected);

        if ( onSelect ){
          onSelect();
        }
      })
    }
  }

  this.selectWeaponOfChoiceByModal = function (lifepathName, onSelect){
    var modalInstance = $modal.open({
      templateUrl: '/choose_weapon_of_choice_partial',
      controller: WeaponOfChoiceModalCtrl,
      resolve: {
        lifepathName: function () {
          return lifepathName;
        }
      }
    });

    modalInstance.result.then(function (selected) {
      console.log("Modal: User selected:");
      console.log(selected);
      if ( onSelect ){
        onSelect(selected);
      }
    }, function () {
      console.log("Modal: User cancelled");
    });
  }


}

/**** End Class WeaponOfChoiceService ****/

/**** Class HusbandLifepathService (Angular Service) ****/
function HusbandLifepathService($modal, $http, burningData) {
  this.hasHusbandLifepath = function (displayLp){
    return displayLp.note?.includes?.("husband's lifepath");
  }
 
  this.selectHusbandLifepath = function (displayLp, onSelect){
    if( this.hasHusbandLifepath(displayLp) ){
      this.selectHusbandLifepathByModal(displayLp, function(selected){
        displayLp.setHusbandLifepath(selected, burningData.lifepaths.man[displayLp.setting][selected]);

        if ( onSelect ){
          onSelect();
        }
      })
    }
  }

  this.selectHusbandLifepathByModal = function (displayLp, onSelect){
    var modalInstance = $modal.open({
      templateUrl: '/choose_husband_lifepath_partial',
      controller: HusbandLifepathModalCtrl,
      resolve: {
        husbandLifepaths: function() {
          return husbandLifepathNames(burningData, displayLp.setting);
        },
        note: function () {
          return displayLp.note;
        }
      }
    });

    modalInstance.result.then(function (selected) {
      console.log("Modal: User selected:");
      console.log(selected);
      if ( onSelect ){
        onSelect(selected);
      }
    }, function () {
      console.log("Modal: User cancelled");
    });
  }
}

/**** Class CharacterStorageService ****/
function CharacterStorageService($http) {
  this.currentCharacter = null;

  this.characterIdAndNames = [];

  myself = this;

  /* Load character names from server */
  this.loadCharacterNames = function(){
    $http.get("/list_chars/user1", {'timeout': 3000} ).
      success(function(data,status,headers,config){
        myself.characterIdAndNames = data;
        console.log("Loaded saved character names");
      }).
      error(function(data,status,headers,config){
        console.log("Error: Loading saved character names from server failed: HTTP code " + status + ": " + data);
      });
  }

  this.loadCharacterNames();
}

/**** End Class CharacterStorageService ****/

/**** Class BurningDataService (Angular Service) ****/
// This service is used to load the lifepaths, skills, traits, etc. from the server.
function BurningDataService($http) {
   /* JSON Data structure representing lifepaths. The structure is:
      stock:
        setting_name:
          lifepath_name:
            time: N
          ...
   */
  this.lifepaths = {};

  /* JSON data structure representing all available skills. The structure is:
      skill_name:
        roots: [root1, root2, ...]
      skill_name:
        roots: [root1, root2, ...]
        
  */
  this.skills = {};

  /* JSON data structure representing all available traits */
  this.traits = {};
  
  /* JSON data structure representing all available resources (gear/property) */
  this.resources = {};

  // A hash of StartingStatPoints objects keyed by stock.
  this.startingStatPts = {};

  this.dataSetsLoaded = 0;
  // Total data sets: 
  //  lifepaths: 7 (man, dwarf, elf, orc, roden, wolf, troll)
  //  stat points: 7 (man, dwarf, elf, orc, roden, wolf, troll)
  //  skills
  //  traits
  //  resources: 7 (man, dwarf, elf, orc, roden, wolf. troll)
  // TOTAL: 23
  this.totalDataSets = 23;
  this.onAllDatasetsLoaded = null;
  this.registerOnAllDatasetsLoaded = function(callback){
    if ( this.dataSetsLoaded >= this.totalDataSets ){
      callback();
    }
    this.onAllDatasetsLoaded = callback;
  }

  this.datasetLoaded = function(){
    this.dataSetsLoaded += 1;
    if ( this.onAllDatasetsLoaded && (this.dataSetsLoaded >= this.totalDataSets) ){
      this.onAllDatasetsLoaded();
    }
    if ( this.dataSetsLoaded > this.totalDataSets){
      console.log("Error: the totalDataSets setting in BurningDataService is too low! This will cause wierd errors. Please adjust it");
    }
  }

  var stocks = ["man", "dwarf", "elf", "orc", "roden", "wolf", "troll"];
  var myself = this;

  /* Load lifepaths from server */
  var loadLifepathsForStock = function(stock){
    if( ! isValidStock(stock) ){
      console.log("Loading lifepaths failed: asked to load lifepaths for invalid stock " + stock);
      return
    }

    $http.get("/lifepaths/" + stock, {'timeout': 3000} ).
      success(function(data,status,headers,config){
        myself.lifepaths[stock] = data;
        myself.datasetLoaded();
        console.log("Loaded "+stock+" lifepaths. " + Object.keys(myself.lifepaths).length + " settings");
      }).
      error(function(data,status,headers,config){
        myself.datasetLoaded();
        console.log("Error: Getting "+stock+" lifepaths from server failed: HTTP code " + status + ": " + data);
      });
  }

  /* Load starting stat points table from server */
  var loadStartingStatPtsForStock = function(stock){
    if( ! isValidStock(stock) ){
      console.log("Loading starting stat points failed: asked to load pts for invalid stock " + stock);
      return
    }

    $http.get("/starting_stat_pts/" + stock, {'timeout': 3000} ).
      success(function(data,status,headers,config){
        myself.startingStatPts[stock] = new StartingStatPoints(data);
        myself.datasetLoaded();
        console.log("Loaded "+stock+" starting stat points. ");
      }).
      error(function(data,status,headers,config){
        myself.datasetLoaded();
        console.log("Error: Getting "+stock+" stat points from server failed: HTTP code " + status + ": " + data);
      });
  }

  /* Load starting stat points table from server */
  var loadResourcesForStock = function(stock){
    if( ! isValidStock(stock) ){
      console.log("Loading resources failed: asked to load for invalid stock " + stock);
      return
    }

    $http.get("/resources/" + stock, {'timeout': 3000} ).
      success(function(data,status,headers,config){
        myself.resources[stock] = data;
        myself.datasetLoaded();
        console.log("Loaded "+stock+" resources. ");
      }).
      error(function(data,status,headers,config){
        myself.datasetLoaded();
        console.log("Error: Getting "+stock+" stat points from server failed: HTTP code " + status + ": " + data);
      });
  }

  for (var i = 0; i < stocks.length; i++) {
    loadLifepathsForStock(stocks[i]);
    loadStartingStatPtsForStock(stocks[i]);
    loadResourcesForStock(stocks[i]);
  }

  /* Load skills from server */
  $http.get("/skills", {'timeout': 3000} ).
    success(function(data,status,headers,config){
      myself.skills = data;
      myself.datasetLoaded();
      console.log("Loaded skills. ");
    }).
    error(function(data,status,headers,config){
      myself.datasetLoaded();
      console.log("Error: Getting skills from server failed: HTTP code " + status + ": " + data);
    });

  /* Load traits from server */
  $http.get("/traits", {'timeout': 3000} ).
    success(function(data,status,headers,config){
      myself.traits = data;
      myself.datasetLoaded();
      console.log("Loaded traits. ");
    }).
    error(function(data,status,headers,config){
      myself.datasetLoaded();
      console.log("Error: Getting traits from server failed: HTTP code " + status + ": " + data);
    });
}
/**** End BurningDataService ****/

