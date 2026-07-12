export const domainUnitTest = `@IsTest
private class <%= it.implementationClassName %>Test {
  @IsTest
  private static void testNewInstanceMethod() {
    Id recordId = fflib_IDGenerator.generate(<%= it.apiName %>.SObjectType);
    <%= it.apiName %> record = new <%= it.apiName %>(Id = recordId);

    Test.startTest();
    <%= it.implementationClassName %>.newInstance(new List<<%= it.apiName %>>{ record });
    <%= it.implementationClassName %>.newInstance(new Set<Id>{ recordId });
    Test.stopTest();
  }
}`;
