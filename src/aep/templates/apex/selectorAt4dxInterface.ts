export const selectorAt4dxInterface = `public interface <%= it.interfaceClassName %> extends IApplicationSObjectSelector {
  List<<%= it.apiName %>> selectById(Set<Id> idSet);
}
`;
