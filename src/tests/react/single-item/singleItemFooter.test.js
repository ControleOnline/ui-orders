import React from 'react';
import renderer,{act} from 'react-test-renderer';
import PaymentCheckoutPanel from '@controleonline/ui-orders/src/react/components/PaymentCheckoutPanel';
jest.mock('react-native',()=>({View:'View',Text:'Text',ScrollView:'ScrollView',TouchableOpacity:'TouchableOpacity',StyleSheet:{create:v=>v},Platform:{OS:'web'}}));
jest.mock('@store',()=>({useStore:()=>({getters:{colors:{cardBackground:'theme-card',radioText:'theme-text'}}})}));
jest.mock('@controleonline/ui-orders/src/react/css/orders',()=>()=>({styles:{scrollContent:{paddingBottom:220}}}));
jest.mock('@controleonline/ui-orders/src/react/components/cart/BottomCart',()=> 'BottomCart');
jest.mock('@controleonline/ui-common/src/react/components/MessageService',()=>({useMessage:()=>({showError:jest.fn()})}));
beforeEach(()=>{global.IS_REACT_ACT_ENVIRONMENT=true;});
it.each([false,true])('reserves footer space only when requested: %s',inlineFooter=>{
 let tree;act(()=>{tree=renderer.create(<PaymentCheckoutPanel inlineFooter={inlineFooter} onSelectPayment={()=>{}} paymentSections={[{key:'local',title:'Neste equipamento',options:[{key:'cash',label:'Dinheiro'}]}]}/>);});
 expect(tree.root.findByType('BottomCart').props.inline).toBe(inlineFooter);
 const content=tree.root.findByType('ScrollView').props.contentContainerStyle;
 const resolved=Object.assign({},...content.filter(Boolean));
 expect(resolved.paddingBottom).toBe(inlineFooter?12:220);
 expect(tree.root.findAllByType('Text').some(n=>n.props.children==='Dinheiro')).toBe(true);
 act(()=>tree.unmount());
});
