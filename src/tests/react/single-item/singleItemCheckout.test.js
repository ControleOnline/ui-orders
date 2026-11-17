import React from 'react';
import {api} from '@controleonline/ui-common/src/api';
import renderer, {act} from 'react-test-renderer';
import useContext from '@controleonline/ui-orders/src/react/pages/checkout/useCheckoutContextState';
import useLoyalty from '@controleonline/ui-orders/src/react/pages/checkout/useCheckoutLoyaltyEffects';
import useSelection from '@controleonline/ui-orders/src/react/pages/checkout/useCheckoutPaymentSelection';
jest.mock('@appType', () => ({app_type: 'POS'}));
jest.mock('react-native', () => ({Platform: {OS: 'web'}}));
jest.mock('@controleonline/ui-common/src/api', () => ({api: {fetch: jest.fn()}}));
const company = {id: 3};
let tree, result, skip, changeCpf;
beforeEach(() => {global.IS_REACT_ACT_ENVIRONMENT = true;});
afterEach(() => {if (tree) act(() => tree.unmount()); tree = undefined;});
it.each([
  ['single-item','none','1',false], ['single-item','stamp','1',true],
  ['single-item','stamp','0',false], ['waiter','tab','1',true], ['cashier','none','1',true],
])('respects %s/%s with company loyalty %s', async (mode, check, enabled, required) => {
  function Harness() {result = useContext({companyConfigs: {'shop-loyalty-coupons-enabled': enabled}, companyDeviceConfigs: [], currentCompany: company, mainCompany: company,
    device: {type: 'PDV', configs: {'pos-operation-mode': mode, 'check-order-type': check}}, order: {id: 1}, route: {params: {id: 1}}, storeStatus: {invoiceGetters: {}, orderProductsGetters: {}, ordersGetters: {}}});return null;}
  await act(async () => {tree = renderer.create(<Harness />);});
  expect(result.requiresLoyaltyCpfStep).toBe(required);
});
const actions = {getFidelitySnapshot: jest.fn()};
function LoyaltyHarness({order, personId = null, companyId = 3}) {
  const [done,setDone] = React.useState(false), [skipped,setSkipped] = React.useState(false);
  const [person,setPerson] = React.useState(personId ? {id: personId} : null);
  const [loading,setLoading] = React.useState(false), [error,setError] = React.useState('');
  const [input,setInput] = React.useState(''), [results,setResults] = React.useState([]), [,setSearch] = React.useState(false), [card,setCard] = React.useState(null);
  changeCpf=setInput;result = {done,skipped,loading,error,card,results};skip=()=>{setPerson(null);setDone(true);setSkipped(true);};
  useLoyalty({order, mainCompany: company, currentCompany: {id: companyId}, ordersActions: actions, requiresLoyaltyCpfStep:true,
    loadingLoyaltySnapshot:loading,loyaltyCpfDigits:input,loyaltyCpfStepCompleted:done,loyaltyCpfStepSkipped:skipped,
    loyaltySearchCompanyId:companyId,loyaltySnapshotError:error,selectedLoyaltyPerson:person,
    setLoadingLoyaltySnapshot:setLoading,setLoyaltyCpfInput:setInput,setLoyaltyCpfLoading:setSearch,
    setLoyaltyCpfResults:setResults,setLoyaltyCpfStepCompleted:setDone,setLoyaltyCpfStepSkipped:setSkipped,
    setLoyaltySnapshotError:setError,setRewardableLoyaltyCard:setCard,setSelectedLoyaltyPerson:setPerson});return null;
}
it('preserves skipping when the same order refreshes, resets for a new order', async () => {
  await act(async () => {tree=renderer.create(<LoyaltyHarness order={{id: 1}}/>);});
  await act(async () => skip());
  await act(async () => tree.update(<LoyaltyHarness order={{id: 1,price: 5}}/>));
  expect(result).toMatchObject({done:true,skipped:true});
  await act(async () => tree.update(<LoyaltyHarness order={{id: 2}}/>));
  expect(result).toMatchObject({done:false,skipped:false});
});
it.each(['success','failure'])('awaits card consultation before completing identification: %s', async outcome => {
  let resolve, reject;actions.getFidelitySnapshot.mockReturnValue(new Promise((a,b)=>{resolve=a;reject=b;}));
  await act(async () => {tree=renderer.create(<LoyaltyHarness order={{id:1,client:{id:20}}} personId={20}/>);});
  expect(result).toMatchObject({loading:true,done:false});
  await act(async () => {if(outcome==='success')resolve({member:[]});else reject(new Error('snapshot unavailable'));});
  expect(result).toMatchObject({loading:false,done:outcome==='success'});
  if(outcome==='failure')expect(result.error).toBe('snapshot unavailable');
});
it('reconciles old cash selection with a completed loyalty card', async () => {
  const cash={key:'cash',payment:{wallet:{'@id':'/wallets/1'},paymentType:{'@id':'/payment_types/1',paymentType:'Dinheiro'}}};
  function Harness(){result=useSelection({localPaymentOptions:[cash],remotePaymentOptions:[],selectedPaymentOption:cash,loyaltyCpfStepCompleted:true,requiresLoyaltyCpfStep:true,rewardableLoyaltyCard:{card:{id:10},completedStampCount:10,requiredSales:10}});return null;}
  await act(async () => {tree=renderer.create(<Harness/>);});
  expect(result.loyaltyRewardOnlyMode).toBe(true);
  expect(result.selectedPayment.__loyaltyReward).toBe(true);
  expect(result.allPaymentOptions).toContain(result.activeSelectedPaymentOption);
});

it('ignores a late fidelity result after the operator skips identification', async () => {
  let resolve;actions.getFidelitySnapshot.mockReturnValue(new Promise(a=>{resolve=a;}));
  await act(async () => {tree=renderer.create(<LoyaltyHarness order={{id:1,client:{id:20}}} personId={20}/>);});
  await act(async () => skip());
  await act(async () => resolve({member:[]}));
  expect(result).toMatchObject({done:true,skipped:true,loading:false,card:null});
});

it('shows the CPF returned by the people API collection', async () => {
  jest.useFakeTimers();
  try {
    api.fetch.mockResolvedValue({member:[{id:105801,name:'QA SINGLE ITEM LOCAL',document:[{document:'99900012356',documentType:{documentType:'CPF'}}]}]});
    await act(async () => {tree=renderer.create(<LoyaltyHarness order={{id:1}}/>);});
    await act(async () => changeCpf('99900012356'));
    await act(async () => {jest.advanceTimersByTime(300);});
    expect(api.fetch).toHaveBeenCalledWith('people', expect.objectContaining({params:expect.objectContaining({search:'99900012356',context:'loyalty-cpf'})}));
    expect(result.results).toEqual([expect.objectContaining({id:105801,cpf:'99900012356'})]);
  } finally {jest.useRealTimers();}
});

it('offers only the full loyalty card owned by the sale company', async () => {
  const full = (id, provider) => ({id, provider:{id:provider}, requiredSales:1, stamps:[{id:1}]});
  actions.getFidelitySnapshot.mockResolvedValue({member:[full(91,8),full(92,3)]});
  await act(async () => {tree=renderer.create(<LoyaltyHarness order={{id:1,provider:{id:3},client:{id:20}}} personId={20}/>);});
  expect(result.card?.id).toBe(92);
});
