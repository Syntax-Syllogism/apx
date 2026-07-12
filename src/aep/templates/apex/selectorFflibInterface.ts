export const selectorFflibInterface = `public interface <%= it.interfaceClassName %> extends fflib_ISObjectSelector
{
    List<<%= it.apiName %>> selectById(Set<Id> idSet);
}
`;
