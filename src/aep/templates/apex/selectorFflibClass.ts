export const selectorFflibClass = `public inherited sharing class <%= it.implementationClassName %> extends fflib_SObjectSelector implements <%= it.interfaceClassName %> {
  public static <%= it.interfaceClassName %> newInstance() {
    return (<%= it.interfaceClassName %>) Application.Selector.newInstance(<%= it.apiName %>.SObjectType);
  }

  public <%= it.implementationClassName %>() {
    super(false, fflib_SObjectSelector.DataAccess.USER_MODE);
  }

  public Schema.SObjectType getSObjectType() {
    return <%= it.apiName %>.SObjectType;
  }

  public List<Schema.SObjectField> getSObjectFieldList() {
    return new List<Schema.SObjectField>{
<% it.fieldNames.forEach(function (fieldName, index) { %>      <%= it.apiName %>.<%= fieldName %><%= index + 1 < it.fieldNames.length ? ',' : '' %>
<% }) %>    };
  }

  public List<<%= it.apiName %>> selectById(Set<Id> idSet) {
    return (List<<%= it.apiName %>>) selectSObjectsById(idSet);
  }
}
`;
