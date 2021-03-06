import Store from "bigdata/store";

module("Store");

test("instantiation", function() {
  ok(new Store());
});

test("load and find", function() {
  var store = new Store();
  store.load('article', 1, {title: 'zomg'});

  var result = store.find('article', 1);
  ok(result);
  equal(result.title, 'zomg');
});

test("all", function() {
  var store = new Store();
  store.load("article", 1, {title: "uno"});
  store.load("article", 2, {title: "dos"});
  store.load("article", 3, {title: "tres"});

  var records = store.all("article");

  equal(records.length, 3);
});

test("save", function() {
  var store = new Store();
  store.load('article', 1, {title: 'zomg'});

  var record = store.find('article', 1);
  record.title = 'wat';
  store.save(record);

  equal(store.find('article', 1).title, 'wat');
});

test("remove", function() {
  var store = new Store();
  store.load('article', 1, {title: 'zomg'});

  var record = store.remove('article', 1);

  equal(store.find('article', 1), undefined);
});

test("fork", function() {
  var store = new Store();
  store.load('article', 1, {title: 'zomg'});

  var fork = store.fork();
  fork.load('article', 1, {title: 'wat'});

  ok(store.versions.article1 < fork.versions.article1);

  equal(store.find('article', 1).title, 'zomg');
  equal( fork.find('article', 1).title, 'wat' );
});

test("merge - store not updated, fork updated", function() {
  var store = new Store();
  store.load('article', 1, {title: 'zomg'});

  var fork = store.fork();
  fork.load('article', 1, {title: 'wat'});

  var conflicts = store.merge(fork);
  equal(conflicts.length, 0);

  equal(store.find('article', 1).title, 'wat');
});

test("merge - store updated, fork not updated", function() {
  var store = new Store();
  store.load('article', 1, {title: 'zomg'});

  var fork = store.fork();

  store.load('article', 1, {title: 'ZOMG'});

  var conflicts = store.merge(fork);
  equal(conflicts.length, 0);

  equal(store.find('article', 1).title, 'ZOMG');
});

test("merge - store updated, fork updated", function() {
  var store = new Store();
  store.load('article', 1, {title: 'zomg'});

  var fork = store.fork();
  fork.load('article', 1, {title: 'wat'});

  store.load('article', 1, {title: 'ZOMG'});

  var conflicts = store.merge(fork);

  equal(conflicts.length, 1);
});

test("resolve merge conflict", function() {
  var store = new Store();
  store.load('article', 1, {title: 'zomg'});

  var fork = store.fork();
  fork.load('article', 1, {title: 'wat'});

  store.load('article', 1, {title: 'ZOMG'});

  var conflicts = store.merge(fork);
  equal(conflicts.length, 1);

  // change the store again
  store.load('article', 1, {title: 'trololo'});

  var conflict = conflicts.pop();
  conflict.lastWriteWins();

  equal(store.find('article1').title, 'trololo');
});