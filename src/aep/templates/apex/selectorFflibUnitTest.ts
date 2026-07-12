export const selectorFflibUnitTest = `@IsTest
private class <%= it.implementationClassName %>Test {
  @IsTest
  private static void testKnownSelectorMethods() {
    Test.startTest();

    System.assert(<%= it.implementationClassName %>.newInstance().selectById(new Set<Id>{fflib_IDGenerator.generate(<%= it.apiName %>.SObjectType)}).isEmpty(), '<%= it.implementationClassName %> selectById verification method failed.');

    Test.stopTest();
  }
}`;
