# How to write great tests

1. Write `test.todo`s for all of the tests that you expect to write, separated into `test.describe` secitons.
2. Write tests for one section at a time.
3. While writing a test, it may be that the code you're testing is incorrect or has a problem in its implementation. If you're running into tests that are failing despite appearing to be correct, mark it as a `test.fails` and move on.
4. When you're done with the sections, create additional snapshot tests.
