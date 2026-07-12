export const selectorAt4dxClass = `public inherited sharing class <%= it.implementationClassName %> extends ApplicationSObjectSelector implements <%= it.interfaceClassName %> {
  public static <%= it.interfaceClassName %> newInstance() {
    return (<%= it.interfaceClassName %>) Application.Selector.newInstance(<%= it.apiName %>.SObjectType);
  }

  public Schema.SObjectType getSObjectType() {
    return <%= it.apiName %>.SObjectType;
  }

  public override List<Schema.SObjectField> getSObjectFieldList() {
    return new List<Schema.SObjectField>{
<% it.fieldNames.forEach(function (fieldName, index) { %>      <%= it.apiName %>.<%= fieldName %><%= index + 1 < it.fieldNames.length ? ',' : '' %>
<% }) %>    };
  }

  @TestVisible
  private List<Schema.SObjectField> getAdditionalSObjectFieldList() {
    return new List<Schema.SObjectField>();
  }

  public List<<%= it.apiName %>> selectById(Set<Id> idSet) {
    return (List<<%= it.apiName %>>) Database.query(newQueryFactory().setCondition('id in :idSet').toSOQL());
  }
}
`;
