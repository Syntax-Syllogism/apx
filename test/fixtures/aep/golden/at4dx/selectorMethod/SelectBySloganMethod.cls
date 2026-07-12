/**
* AT4DX Selector Method Injection class
*
* @Usage
*   SelectBySloganMethod.Parameters queryParams = new SelectBySloganMethod.Parameters();
*   List<Account> records = AccountsSelector.newInstance().selectInjection(SelectBySloganMethod.class, queryParams);
*/
public inherited sharing class SelectBySloganMethod extends AbstractSelectorMethodInjectable implements ISelectorMethodInjectable {
  public List<SObject> selectQuery() {
    SelectBySloganMethod.Parameters params = (SelectBySloganMethod.Parameters) getParams();
    fflib_QueryFactory qf = newQueryFactory();
    qf.setCondition('');
    return Database.query(qf.toSOQL());
  }

  public class Parameters implements ISelectorMethodParameterable {}
}
