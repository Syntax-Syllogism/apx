export const selectorMethodClass = `/**
* AT4DX Selector Method Injection class
*
* @Usage
*   <%= it.className %>.Parameters queryParams = new <%= it.className %>.Parameters();
*   List<<%= it.apiName %>> records = <%= it.selectorImplementationClassName %>.newInstance().selectInjection(<%= it.className %>.class, queryParams);
*/
public inherited sharing class <%= it.className %> extends AbstractSelectorMethodInjectable implements ISelectorMethodInjectable {
  public List<SObject> selectQuery() {
    <%= it.className %>.Parameters params = (<%= it.className %>.Parameters) getParams();
    fflib_QueryFactory qf = newQueryFactory();
    qf.setCondition('');
    return Database.query(qf.toSOQL());
  }

  public class Parameters implements ISelectorMethodParameterable {}
}
`;
