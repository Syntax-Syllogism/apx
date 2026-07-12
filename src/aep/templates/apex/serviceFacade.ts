export const serviceFacade = `public inherited sharing class <%= it.facadeClassName %> {
  private static <%= it.interfaceClassName %> service() {
    return (<%= it.interfaceClassName %>) Application.Service.newInstance(<%= it.interfaceClassName %>.class);
  }
}
`;
