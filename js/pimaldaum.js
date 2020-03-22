var app = angular.module('PiMalDaumApp', ['ngMaterial','ngRoute']);
var PiMalDaumWebApp = window.PiMalDaumWebApp || {};

app.config(function($routeProvider) {
  $routeProvider
      .when("/", {
        templateUrl : "start.html"
      })
      .when("/games", {
        templateUrl : "games.html"
      })
      .when("/games/details", {
        templateUrl : "gamedetails.html"
      })
      .when("/games/add", {
        templateUrl : "addgame.html"
      })
      .otherwise({
        redirectTo: "/"
      });
});

app.controller('myCtrl', function($scope, $mdSidenav, $location, $http, $mdDialog) {

    var authToken;

    // PiMalDaumWebApp.authToken.then(function updateAuthMessage(token) {
    //     if (token) {
    //         console.log(token);
    //     }
    // });

    var poolData = {
        UserPoolId: _config.cognito.userPoolId,
        ClientId: _config.cognito.userPoolClientId
    };

    var userPool;

    if (!(_config.cognito.userPoolId &&
          _config.cognito.userPoolClientId &&
          _config.cognito.region)) {
        $('#noCognitoMessage').show();
        return;
    }

    userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    PiMalDaumWebApp.authToken = new Promise(function fetchCurrentAuthToken(resolve, reject) {
        var cognitoUser = userPool.getCurrentUser();

        if (cognitoUser) {
            cognitoUser.getSession(function sessionCallback(err, session) {
                if (err) {
                    console.log("no session");
                    reject(err);
                } else if (!session.isValid()) {
                    console.log("session not valid");
                    resolve(null);
                } else {
                    console.log("session valid");
                    console.log("Session: " + session.getIdToken().getJwtToken());
                    $scope.authToken = session.getIdToken().getJwtToken();
                    resolve(session.getIdToken().getJwtToken());
                }
            });
        } else {
            resolve(null);
        }
    });

    $scope.toggleLeft = buildToggler('left');

    $scope.toolbarHeader = "Pi Mal Daum"

    function buildToggler(componentId) {
      return function() {
        $mdSidenav(componentId).toggle();
      };
    };

    $scope.games = [];

    $scope.players = [
        {
            ID: 1,
            name: "Chrissi",
            isParticipant: false
        },
        {
            ID: 2,
            name: "Stevie",
            isParticipant: false
        },
        {
            ID: 3,
            name: "Holger",
            isParticipant: false
        },
        {
            ID: 4,
            name: "Kaius",
            isParticipant: false
        },
        {
            ID: 5,
            name: "Piepo",
            isParticipant: false
        }
    ];

    $scope.openGames = function(){

        $scope.games = [];

        $http({
          method: "GET",
          url: "https://40cfpckdmc.execute-api.eu-central-1.amazonaws.com/prod/get-games",
          headers: {
            "Authorization": $scope.authToken,
            "Content-Type": "application/json",
          },
        }).then(function successCallback(response) {
            console.log(JSON.stringify(response.data.data.Items))
            for(var i=0; i < response.data.data.Items.length; i++) {
                var tempHostObj = $scope.players.filter(d => d.ID == response.data.data.Items[i].GamesHost)[0];
                console.log(tempHostObj);
                var tempHost = tempHostObj.name;

                var tempGame = {
                    ID: response.data.data.Items[i].GamesID,
                    date: response.data.data.Items[i].GamesDate,
                    host: tempHost
                };
                $scope.games.push(tempGame);
            };
        }, function errorCallback(response) {
            console.log("Spiele konnten leider nicht vom Server abgerufen werden: " + JSON.stringify(response))
        });

        $location.path('/games');
        $scope.toolbarHeader = "Spiele"
    };

    $scope.openNewGame = function(){
        $location.path('/games/add');
        $scope.toolbarHeader = "Neues Spiel"
    }

    $scope.host = $scope.players[0];

    $scope.selectChanged = function(){
        alert($scope.host);
    };

    $scope.addNewGame = function(){

        var today = new Date();
        var dd = String(today.getDate()).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = today.getFullYear();
        var currentDate = dd + "." + mm + "." + yyyy;

        var newID = ($scope.games.length * 1) + 1;

        var newGame = {
            ID: newID,
            date: currentDate,
            host: this.host.name,
        };

        $scope.games.push(newGame);

        $scope.jsonData = {
            GameID: newID,
            GameDate: currentDate,
            GameHost: this.host.ID
        };

        $http({
          method: "POST",
          url: "https://40cfpckdmc.execute-api.eu-central-1.amazonaws.com/prod/create-game",
          headers: {
            "Authorization": $scope.authToken,
            "Content-Type": "application/json",
          },
          data: JSON.stringify($scope.jsonData)
        }).then(function successCallback(response) {
            // create a player per game entry for each player, that is participating
            for(var i=0; i < $scope.players.length; i++) {
                // create a data record for each player, who is participating
                if($scope.players[i].isParticipant == true){
                    var tempPPG = {
                        PPGID: parseInt(newID.toString() + $scope.players[i].ID.toString()),
                        GameID: newID,
                        PlayerID: $scope.players[i].ID
                    };

                    $http({
                      method: "POST",
                      url: "https://40cfpckdmc.execute-api.eu-central-1.amazonaws.com/prod/create-player-per-game",
                      headers: {
                        "Authorization": $scope.authToken,
                        "Content-Type": "application/json",
                      },
                      data: JSON.stringify(tempPPG)
                    }).then(function successCallback(response) {
                        // 
                    }, function errorCallback(response) {
                        alert("Ups, da ist etwas schief gelaufen: " + JSON.stringify(response))
                    });
                };
            };

            $scope.openGames();
        }, function errorCallback(response) {
            alert("Das hat leider nicht geklappt: " + JSON.stringify(response))
        });
    };

    $scope.gameParticipants = [];

    $scope.openGame = function(GameID){
        // function, to open game details
        var tempGameID = {"gameID": GameID};
        // get all participants of the selected game
        $http({
          method: "GET",
          url: "https://40cfpckdmc.execute-api.eu-central-1.amazonaws.com/prod/get-player-per-game?gameId=" + GameID,
          headers: {
            "Authorization": $scope.authToken,
            "Content-Type": "application/json",
          }
        }).then(function successCallback(response) {
            $scope.gameParticipants = [];

            // push name of each partcipant to gameParticipants array
            for(var i=0; i < response.data.data.Items.length; i++) {
                // get name by filtering the players JSON for the PlayerID
                var tempPlayer = {name: $scope.players.filter(d => d.ID == response.data.data.Items[i].PlayerID)[0].name}
                $scope.gameParticipants.push(tempPlayer);
            };

            console.log($scope.gameParticipants);
            // $location.path('/games/details');
            // $scope.toolbarHeader = "Runden"
        }, function errorCallback(response) {
            console.log("Spiele konnten leider nicht vom Server abgerufen werden: " + JSON.stringify(response))
        });
        // get all rounds of the selected game
        $http({
          method: "GET",
          url: "https://40cfpckdmc.execute-api.eu-central-1.amazonaws.com/prod/get-rounds-per-game?gameId=" + GameID,
          headers: {
            "Authorization": $scope.authToken,
            "Content-Type": "application/json",
          }
        }).then(function successCallback(response) {
            $scope.gameRounds = [];

            // push name of each partcipant to gameParticipants array
            for(var i=0; i < response.data.data.Items.length; i++) {
                // get name by filtering the players JSON for the PlayerID
                var tempRound = {count: response.data.data.Items[i].RoundCount, giver: response.data.data.Items[i].GiverID, quid: response.data.data.Items[i].Quid}
                $scope.gameRounds.push(tempRound);
            };

            console.log($scope.gameRounds);
            $location.path('/games/details');
            $scope.toolbarHeader = "Runden"
        }, function errorCallback(response) {
            console.log("Runden konnten leider nicht vom Server abgerufen werden: " + JSON.stringify(response))
        });
    };

    // Show summary alert
    $scope.customFullscreen = true;
    var tempGameParticipants = [];

    $scope.showSummary = function(ev) {

        tempGameParticipants = $scope.gameParticipants;

        $mdDialog.show({
            controller: DialogController,
            templateUrl: 'gamessummarydialog.html',
            parent: angular.element(document.body),
            targetEvent: ev,
            clickOutsideToClose:true,
            fullscreen: $scope.customFullscreen // Only for -xs, -sm breakpoints.
        }).then(function(answer) {
            $scope.status = 'You said the information was "' + answer + '".';
        }, function() {
            $scope.status = 'You cancelled the dialog.';
        });
    };

    function DialogController($scope, $mdDialog) {
        $scope.gameParticipants = tempGameParticipants;

        $scope.hide = function() {
            $mdDialog.hide();
        };

        $scope.cancel = function() {
            $mdDialog.cancel();
        };

        $scope.answer = function(answer) {
            $mdDialog.hide(answer);
        };
    };
});