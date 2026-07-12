export const criteriaUnitTest = `@IsTest
private class <%= it.unitTestClassName %> {
  @IsTest
  private static void testRun() {
    <%= it.className %> criteria = new <%= it.className %>();
    criteria.setRecordsToEvaluate(new List<SObject>{ new <%= it.sobjectApiName %>() });

    Test.startTest();
    List<SObject> result = criteria.run();
    Test.stopTest();

    System.assertEquals(1, result.size());
  }
}
`;
