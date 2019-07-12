function loadCurrentCharacterFromStruct($scope, charStruct, burningData, appropriateWeapons){
    $scope.name = charStruct.name;
    $scope.gender = charStruct.gender;
    $scope.stock = charStruct.stock;

    // Appropriate weapons must be loaded before calculateLifepathSkills is called.
    if(serverSettings.storageType != 'server'){
      appropriateWeapons.appropriateWeapons = charStruct.approp_weapons;
    }

    calculateGearSelectionLists($scope, burningData);
    calculatePropertySelectionLists($scope, burningData);

    // Load lifepaths
    var selectedLifepaths = [];
    for(var i = 0; i < charStruct.lifepaths.length; i++){
      var lp = charStruct.lifepaths[i];
      // lp[0] is setting name, lp[1] is lifepath name. 
      // lp[2] is brutalLifeDOF, lp[3] is brutalLifeTraitName, 
      // lp[4] is lifepath time, if it's variable and the user selected a value
      // lp[5] is the replacement skill for 'Weapon Of Choice' if it's present.
      // lp[6] is the replacement stat array, if present. This is needed if the
      //       lifepath had a stat penalty.

      var setting = burningData.lifepaths[$scope.stock][lp[0]];
      if (!setting)
        return;

      var lifepath = setting[lp[1]];
      if (!lifepath)
        return;
      displayLp = new DisplayLifepath(lp[0], lp[1], lifepath);
      displayLp.brutalLifeDOF = lp[2];
      displayLp.brutalLifeTraitName = lp[3];
      if (displayLp.timeIsChoosable && lp[4] != null)
        displayLp.time = lp[4];

      if (lp[5] != null)
        displayLp.weaponOfChoice = lp[5];

      if (lp[6] != null)
        displayLp.stat = lp[6]

      var prevLifepath = null;
      if(selectedLifepaths.length > 0)
        prevLifepath = selectedLifepaths[selectedLifepaths.length-1];
      displayLp.calculateResourcePoints(prevLifepath);

      displayLp.modifyForDiminishingReturns(selectedLifepaths);
      selectedLifepaths.push(displayLp);
    }
    $scope.selectedLifepaths = selectedLifepaths;

    // Load stat points
    for(var i = 0; i < charStruct.stats.length; i++){
      var stat = charStruct.stats[i];
      var displayStat = $scope.statsByName[stat.name];
      if ( displayStat ){
        displayStat.shade = stat.shade
        displayStat.mentalPointsSpent = stat.mentalPoints
        displayStat.physicalPointsSpent = stat.physicalPoints
        displayStat.eitherPointsSpent = stat.eitherPoints
      }
    }


    calculateAge($scope);
    calculateTotalStatPoints($scope, burningData);
    calculateUnspentStatPoints($scope);
    calculateLifepathSkills($scope, burningData, appropriateWeapons);
    calculatePTGS($scope);

    // Load skills
    for(var i = 0; i < charStruct.skills.lifepath.length; i++){
      var skill = charStruct.skills.lifepath[i];
      var displaySkill = $scope.lifepathSkills[skill.name];
      if ( displaySkill ){
        displaySkill.lifepathPointsSpent = skill.lifepathPoints;
        displaySkill.generalPointsSpent = skill.generalPoints;
      }
    }

    // General skills must be added.
    for(var i = 0; i < charStruct.skills.general.length; i++){
      var skill = charStruct.skills.general[i];

      var displaySkill = null;
      if (skill.name in burningData.skills && !(skill.name in $scope.lifepathSkills)){
        displaySkill = new DisplaySkill(skill.name, burningData.skills);
        $scope.generalSkills[skill.name] = displaySkill;
      }

      if ( displaySkill ){
        displaySkill.lifepathPointsSpent = skill.lifepathPoints;
        displaySkill.generalPointsSpent = skill.generalPoints;
      }
    }

    calculateTotalSkillPoints($scope);
    openRequiredSkills($scope);
    calculateUnspentSkillPoints($scope);
    calculateSettingNames($scope, burningData);
    calculateCurrentSettingLifepathNames($scope, burningData);
    calculateLifepathTraits($scope, burningData);
    setCommonTraits($scope, burningData);
    purchaseRequiredTraits($scope, burningData);
    calculateUnspentTraitPoints($scope);
    addBrutalLifeRequiredTraits($scope, burningData);

    // Load Traits
    for(var i = 0; i < charStruct.traits.length; i++){
      var trait = charStruct.traits[i];
      if( $scope.purchasedTraits[trait.name] ){
        continue;
      }

      var displayTrait = new DisplayTrait(trait.name, burningData.traits);
      $scope.purchasedTraits[trait.name] = displayTrait;

      if( $scope.lifepathTraits[trait.name] ){
        $scope.unspentTraitPoints -= 1;
      }
      else {
        $scope.unspentTraitPoints -= displayTrait.cost;
      }
    }
    calculateTraitWarnings($scope, burningData);

    // Load Resources
    $scope.gear = {};
    for(var i = 0; i < charStruct.gear.length; i++){    
      var gear = charStruct.gear[i];
      $scope.gear[gear.desc] = new DisplayGear(gear.desc, gear.cost);
    }

    $scope.property = {};
    for(var i = 0; i < charStruct.property.length; i++){    
      var property = charStruct.property[i];
      $scope.property[property.desc] = new DisplayGear(property.desc, property.cost);
    }
    
    $scope.relationships = {};
    for(var i = 0; i < charStruct.relationships.length; i++){    
      var rel = charStruct.relationships[i];
      $scope.relationships[rel.desc] = new DisplayRelationship(
        rel.desc,
        rel.importance,
        rel.isImmedFam,
        rel.isOtherFam,
        rel.isRomantic,
        rel.isForbidden,
        rel.isHateful
      );
    }

    $scope.affiliations = {};
    for(var i = 0; i < charStruct.affiliations.length; i++){    
      var affil = charStruct.affiliations[i];
      $scope.affiliations[affil.desc] = new DisplayAffiliation(affil.desc, affil.importance);
    }

    $scope.reputations = {};
    for(var i = 0; i < charStruct.reputations.length; i++){    
      var rep = charStruct.reputations[i];
      $scope.reputations[rep.desc] = new DisplayReputation(rep.desc, rep.importance);
    }

    calculateTotalResourcePoints($scope);
    calculateUnspentResourcePoints($scope);
    applyBonusesFromTraits($scope);

    // Load attribute modifying questions
    $scope.attributeModifierQuestionResults = loadAttributeModifierQuestionResultsFromSave($scope, charStruct.attr_mod_questions);

    $scope.brutalLifeWithdrawn = charStruct.brutal_life_withdrawn;

}

function convertCurrentCharacterToStruct($scope, appropriateWeapons) {
  // To serialize:
  //  - Serialized version
  //  - Character name
  //  - Stock 
  //  - Gender
  //  - A list Lifepath names, with setting: [setting, lifepath]
  //  - How many points were spent on which stat
  //  - A list of skills that points were spent on, and how many points
  //  - A list of traits
  //  - A list of gear, property, relationships, reputations, and affiliations
  //  - A hash containing the answers to attribute-modifying questions
  //  - If we are not using the server storage backend, save the appropriate weapons settings

  // Structure:
  var chardata = {
    "serialize_version": serializeVersion,
    "name" : $scope.name,
    "gender" : $scope.gender,
    "stock" : $scope.stock,
  };

  var lifepaths = [];
  for(var i = 0; i < $scope.selectedLifepaths.length; i++){
    var displayLp = $scope.selectedLifepaths[i];
    var lp = [displayLp.setting, displayLp.name, displayLp.brutalLifeDOF, displayLp.brutalLifeTraitName];
    if( displayLp.timeIsChoosable ){
      lp.push(displayLp.time);
    } else {
      lp.push(null);
    }

    if( displayLp.weaponOfChoice ){
      lp.push(displayLp.weaponOfChoice);
    } else {
      lp.push(null);
    }

    lp[6] = displayLp.stat;

    lifepaths.push(lp);
  }
  chardata.lifepaths = lifepaths;

  var stats = [];
  for(var i = 0; i < $scope.stats.length; i++){
    var displayStat = $scope.stats[i];

    stats.push({
      "name" : displayStat.name, 
      "shade" : displayStat.shade, 
      "mentalPoints" : displayStat.mentalPointsSpent, 
      "physicalPoints" : displayStat.physicalPointsSpent, 
      "eitherPoints" : displayStat.eitherPointsSpent
    });
  }
  chardata.stats = stats;

  var lifepathSkills = [];
  var generalSkills = [];
  var addSkillTo = function(list, displaySkill){
    list.push({
      "name" : displaySkill.name,
      "lifepathPoints" : displaySkill.lifepathPointsSpent,
      "generalPoints" : displaySkill.generalPointsSpent,
    });
  }
  for(var key in $scope.lifepathSkills){
    var displaySkill = $scope.lifepathSkills[key];
    addSkillTo(lifepathSkills, displaySkill);
  }
  for(var key in $scope.generalSkills){
    var displaySkill = $scope.generalSkills[key];
    addSkillTo(generalSkills, displaySkill);
  }
  chardata.skills = {
    "lifepath" : lifepathSkills,
    "general" : generalSkills,
  };

  var traits = [];
  for(var key in $scope.purchasedTraits){
    var displayTrait = $scope.purchasedTraits[key];
    traits.push({
      "name" : displayTrait.name
    });
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
    return { 
      "cost" : display.cost,
      "desc" : display.desc
    };
  });
  chardata.gear = res;

  var res = serializeResource( $scope.property, function(display){
    return { 
      "cost" : display.cost,
      "desc" : display.desc
    };
  });
  chardata.property = res;

  var res = serializeResource( $scope.relationships, function(display){
    return { 
      "desc" : display.desc,
      "importance" : display.importance,
      "isImmedFam" : display.isImmedFam,
      "isOtherFam" : display.isOtherFam,
      "isRomantic" : display.isRomantic,
      "isForbidden" : display.isForbidden,
      "isHateful" : display.isHateful
    };
  });
  chardata.relationships = res;

  var res = serializeResource( $scope.affiliations, function(display){
    return { 
      "desc" : display.desc,
      "importance" : display.importance
    };
  });
  chardata.affiliations = res;

  var res = serializeResource( $scope.reputations, function(display){
    return { 
      "desc" : display.desc,
      "importance" : display.importance
    };
  });
  chardata.reputations = res;

  chardata.attr_mod_questions = convertAttributeModifierQuestionResultsForSave($scope);

  chardata.brutal_life_withdrawn = $scope.brutalLifeWithdrawn;

  if(serverSettings.storageType != 'server'){
    chardata.approp_weapons = appropriateWeapons.appropriateWeapons;
  }

  return chardata;
}

