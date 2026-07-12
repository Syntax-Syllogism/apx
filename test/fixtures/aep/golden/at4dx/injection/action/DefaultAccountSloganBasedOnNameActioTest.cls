@IsTest
private class DefaultAccountSloganBasedOnNameActioTest {
  @IsTest
  private static void testInstantiation() {
    DefaultAccountSloganBasedOnNameAction actionInstance = new DefaultAccountSloganBasedOnNameAction();

    Test.startTest();
    Test.stopTest();

    System.assertNotEquals(null, actionInstance);
  }
}
