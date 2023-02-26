// For use with the angular ui bootstrap Modal call
function AppropriateWeaponsModalCtrl($scope, $modalInstance, lifepathName, chosen) {
  $scope.chosen = {}
  for(var i = 0; i < chosen.length; i++){
    $scope.chosen[chosen[i]] = true;
  }

  $scope.lifepathName = lifepathName;

  $scope.weaponSkillsNames = function(){
    return weaponSkillsNames();
  }

  $scope.ok = function(){
    var chosen = [];
    for(key in $scope.chosen){
      if( $scope.chosen[key] == true ){
        chosen.push(key);
      }
    }

    $modalInstance.close(chosen);
  }

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };

}

// For use with the angular ui bootstrap Modal call
function WeaponOfChoiceModalCtrl($scope, $modalInstance, lifepathName) {
  $scope.chosen = [weaponSkillsNames()[0]];
  $scope.lifepathName = lifepathName;

  $scope.weaponSkillsNames = function(){
    return weaponSkillsNames();
  }

  $scope.ok = function(){
    $modalInstance.close($scope.chosen[0]);
  }

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };

}

// For use with the angular ui bootstrap Modal call
function HusbandLifepathModalCtrl($scope, $modalInstance, burningData, setting, lifepathName) {
  $scope.chosen = [husbandLifepathNames(burningData, setting)[0]];
  $scope.lifepathName = lifepathName;

  $scope.husbandLifepathNames = function(){
    return husbandLifepathNames(burningData, setting);
  }

  $scope.ok = function(){
    $modalInstance.close($scope.chosen[0]);
  }

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };

}

// For use with the angular ui bootstrap Modal call
function EmotionalAttributeModalCtrl($scope, $modalInstance, attributeName, questions, displayEmotionalMath) {
  $scope.attributeName = attributeName;

  //$scope.questions = ["Where do you live?"];
  $scope.questions = questions;
  $scope.displayEmotionalMath = displayEmotionalMath;

  $scope.ok = function(){
    $modalInstance.close($scope.questions);
  }

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };

  $scope.formatModifier = function(val){
    if ( null == val ) 
      return "?";

    if(val > 0){
      return "+"+val;
    }
    else {
      return val.toString();
    }
  }
}

function ChooseCharacterModalCtrl($scope, $modalInstance, characterStorage, message) {
  $scope.characterStorage = characterStorage;

  $scope.message = message;

  $scope.characterIdAndName = null;
  if(characterStorage.characterIdAndNames.length > 0){
    $scope.characterIdAndName = characterStorage.characterIdAndNames[0];
  }

  $scope.ok = function(characterIdAndName){
    $modalInstance.close(characterIdAndName);
  }

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };
}

function TraitSearchModalCtrl($scope, $modalInstance, specialTraitsForDisplay, unspentTraitPoints, totalTraitPoints) {
  $scope.specialTraitsForDisplay = specialTraitsForDisplay;

  $scope.data = {currentTrait: specialTraitsForDisplay[0]}

  $scope.unspentTraitPoints = unspentTraitPoints;
  $scope.totalTraitPoints = totalTraitPoints;

  // See https://github.com/angular/angular.js/wiki/Understanding-Scopes
  // It explains the reason we can't simply make a typeFilter property on this scope
  // and have it work from the modal. We need to make a non-primitive type
  // for this to work.
  $scope.filters = {typeFilter: "", costFilter: "", canAfford: true}

  $scope.makeCostFilterFunc = function(){
    var matches = $scope.filters.costFilter.match(/([<=>])\s*(\d+)/);
    if(! matches){
      //console.log("ChooseCharacterModalCtrl.makeCostFilterFunc: invalid expression");
      return null;
    }

    var operand = parseInt(matches[2]);

    if(matches[1] == '<'){
      return function(val){
        return val < operand;
      }
    }
    else if(matches[1] == '>'){
      return function(val){
        return val > operand;
      }
    }
    else {
      return function(val){
        return val == operand;
      }
    }
  }


  $scope.filteredTraits = function(){
    var list = [];
  
    var costFunc = $scope.makeCostFilterFunc();

    var currentTraitInList = false;

    for(var i = 0; i < $scope.specialTraitsForDisplay.length;i++){
      var trait = $scope.specialTraitsForDisplay[i];
      if($scope.filters.typeFilter != "" && trait.type != $scope.filters.typeFilter)
        continue;

      if(costFunc && !costFunc(trait.cost))
        continue;
      
      if($scope.filters.canAfford && trait.cost > $scope.unspentTraitPoints)
        continue;

      if($scope.data.currentTrait && $scope.data.currentTrait.name == trait.name)
        currentTraitInList = true;

      list.push(trait);
    }

    if(!currentTraitInList)
      $scope.data.currentTrait = list[0];

    return list;
  }

  $scope.ok = function(){
    $modalInstance.close($scope.data.currentTrait);
  }

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };
}

function UploadCharacterModalCtrl($scope, $modalInstance) {
  $scope.ok = function(){
    $modalInstance.close();
  }

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };
}

// For use with the angular ui bootstrap Modal call
function StatPenaltyModalCtrl($scope, $modalInstance, lifepath, amount) {
  $scope.amount = amount;
  $scope.lifepath = lifepath;
  $scope.unspentAmount = amount;

  $scope.pool = {
    'physical': 0,
    'mental': 0
  }
    
  $scope.ok = function(){
    if ($scope.unspentAmount == 0) {
      $modalInstance.close($scope.pool);
    }
  }

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };

  $scope.incrementPool = function(pool){
    if ($scope.unspentAmount <= 0) 
      return;

    $scope.pool[pool]++;
    $scope.unspentAmount--;
  }

  $scope.decrementPool = function(pool){
    if ($scope.pool[pool] <= 0) 
      return;

    $scope.pool[pool]--;
    $scope.unspentAmount++;
  }

}

