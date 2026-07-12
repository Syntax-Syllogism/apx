export const actionUnitTest = `@IsTest
private class <%= it.unitTestClassName %> {
  @IsTest
  private static void testInstantiation() {
    <%= it.className %> actionInstance = new <%= it.className %>();

    Test.startTest();
    Test.stopTest();

    System.assertNotEquals(null, actionInstance);
  }
}
`;
