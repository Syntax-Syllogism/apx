export const domainFflibClass = `public inherited sharing class <%= it.implementationClassName %> extends fflib_SObjectDomain implements <%= it.interfaceClassName %> {
  public static <%= it.interfaceClassName %> newInstance(List<<%= it.apiName %>> records) {
    return (<%= it.interfaceClassName %>) Application.Domain.newInstance(records);
  }

  public static <%= it.interfaceClassName %> newInstance(Set<Id> recordIds) {
    return (<%= it.interfaceClassName %>) Application.Domain.newInstance(recordIds);
  }

  public <%= it.implementationClassName %>(List<<%= it.apiName %>> records) {
    super(records);
  }

  public class Constructor implements fflib_SObjectDomain.IConstructable {
    public fflib_SObjectDomain construct(List<SObject> sObjectList) {
      return new <%= it.implementationClassName %>(sObjectList);
    }
  }
}
`;
