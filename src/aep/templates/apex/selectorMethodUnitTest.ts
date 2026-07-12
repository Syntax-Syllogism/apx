export const selectorMethodUnitTest = `@IsTest
private class <%= it.unitTestClassName %> {
  @IsTest
  private static void testSelectQueryMethod() {
    Test.startTest();

    System.assert(<%= it.selectorImplementationClassName %>.newInstance().selectInjection(<%= it.className %>.class, null) != null, '<%= it.selectorImplementationClassName %>\\'s selectInjection verification method for <%= it.className %> selector method injection failed.');

    Test.stopTest();
  }
}`;
