@IsTest
private class AccountNameContainsFishCriteriaTest {
  @IsTest
  private static void testRun() {
    AccountNameContainsFishCriteria criteria = new AccountNameContainsFishCriteria();
    criteria.setRecordsToEvaluate(new List<SObject>{ new Account() });

    Test.startTest();
    List<SObject> result = criteria.run();
    Test.stopTest();

    System.assertEquals(1, result.size());
  }
}
