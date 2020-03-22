var app = angular.module('SignInApp', ['ngMaterial']);
var PiMalDaumWebApp = window.PiMalDaumWebApp || {};

app.controller('myCtrl', function($scope) {

    var authToken;
    
    PiMalDaumWebApp.authToken = new Promise(function fetchCurrentAuthToken(resolve, reject) {
        var cognitoUser = userPool.getCurrentUser();
        console.log("creatingAuthToken")

        if (cognitoUser) {
            cognitoUser.getSession(function sessionCallback(err, session) {
                if (err) {
                    reject(err);
                } else if (!session.isValid()) {
                    resolve(null);
                } else {
                    resolve(session.getIdToken().getJwtToken());
                }
            });
        } else {
            resolve(null);
        }
    });

	/*SOMETHING GOES HERE*/
	$scope.email = "";
	$scope.password = "";
	$scope.message = "";
	$scope.showLoginErrorMessage = false;

	var signinUrl = 'index.html';

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

    if (typeof AWSCognito !== 'undefined') {
        AWSCognito.config.region = _config.cognito.region;
    }

    PiMalDaumWebApp.signOut = function signOut() {
        userPool.getCurrentUser().signOut();
    };

    /*SIGN IN FUNCTION*/

    $scope.handleSignin = function($event){
    /*function handleSignin(event) {*/
        var email = $scope.email;
        var password = $scope.password;
        $event.preventDefault();
        signin(email, password,
            function signinSuccess() {

                console.log('Successfully Logged In');

                window.location.href = 'pmdapp.html';
            },
            function signinError(err) {
                $scope.message = err;
				$scope.showLoginErrorMessage = true;
            }
        );
    };

    function signin(email, password, onSuccess, onFailure) {
        var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
            Username: email,
            Password: password
        });

        var cognitoUser = createCognitoUser(email);
        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: onSuccess,
            onFailure: onFailure
        });
    };

    function createCognitoUser(email) {
        return new AmazonCognitoIdentity.CognitoUser({
            Username: email,
            Pool: userPool
        });
    };

  $scope.login = function(){
  };
});