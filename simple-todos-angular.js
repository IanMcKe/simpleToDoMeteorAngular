Tasks = new Mongo.Collection('tasks');

if (Meteor.isClient) {
  // counter starts at 0
  Session.setDefault('counter', 0);

  Template.hello.helpers({
    counter: function () {
      return Session.get('counter');
    }
  });

  Template.hello.events({
    'click button': function () {
      // increment the counter when button is clicked
      Session.set('counter', Session.get('counter') + 1);
    }
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });

  angular.module('simple-todos',['angular-meteor']);

  angular.module('simple-todos').controller('TodosListCtrl', ['$scope','$meteor',
    function($scope, $meteor) {
      $scope.query = {}
      var vm = this;

      $scope.$watch('vm.hideCompleted', function() {
        if (vm.hideCompleted) {
          $scope.query = {checked: {$ne: true}};
        }
        else {
          $scope.query = {};
        }
      });

      $scope.$meteorSubscribe('tasks');

      vm.tasks = $meteor.collection( function() {
        return Tasks.find($scope.getReactively('query'), { sort: { createdAt: -1 } });
      });

      vm.addTask = function (newTask) {
        $meteor.call('addTask', newTask);
      };

      vm.deleteTask = function(task) {
        $meteor.call('deleteTask', task._id);
      };

      vm.setChecked = function (task) {
        $meteor.call('setChecked', task._id, !task.checked);
      };

      vm.setPrivate = function (task) {
        $meteor.call('setPrivate', task._id, !task.private);
      };
  }]);
}

if (Meteor.isServer) {
  Meteor.publish('tasks', function () {
    return Tasks.find({
      $or: [
        { private: {$ne: true} },
        { owner: this.userId }
      ]
    });
  });

  Meteor.startup(function () {
    // code to run on server at startup
  });
}

Meteor.methods({
  addTask: function (text) {
    if(!Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Tasks.insert({
      text: text,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
    });
  },

  deleteTask: function (taskId) {
    var task = Tasks.findOne(taskId);
    if(task.private && task.owner !== Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }
    
    Tasks.remove(taskId);
  },

  setChecked: function (taskId, setChecked) {
    var task = Tasks.findOne(taskId);
    if(task.private && task.owner !== Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Tasks.update(taskId, { $set: { checked: setChecked } });
  },

  setPrivate: function (taskId, setToPrivate) {
    var task = Tasks.findOne(taskId);

    //make sure only the task owner can make a task private
    if (task.owner !== Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Tasks.update(taskId, { $set: { private: setToPrivate } });
  }
});
