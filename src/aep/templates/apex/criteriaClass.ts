export const criteriaClass = `public inherited sharing class <%= it.className %> implements IDomainProcessCriteria {
  private List<SObject> recordsToEvaluate = new List<SObject>();

  public IDomainProcessCriteria setRecordsToEvaluate(List<SObject> recordsToEvaluate) {
    this.recordsToEvaluate = recordsToEvaluate == null ? new List<SObject>() : recordsToEvaluate;
    return this;
  }

  public List<SObject> run() {
    List<<%= it.sobjectApiName %>> scopedRecords = (List<<%= it.sobjectApiName %>>) this.recordsToEvaluate;
    // TODO: implement criteria evaluation and return matching records.
    if (scopedRecords.isEmpty()) return new List<SObject>();
    List<SObject> result = new List<SObject>();
    for (<%= it.sobjectApiName %> recordValue : scopedRecords) {
      result.add(recordValue);
    }
    return result;
  }
}
`;
