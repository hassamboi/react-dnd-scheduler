import { Scheduler, SchedulerProvider } from './context/createCustomScheduler';
import { BaseItem, BaseLane } from './types';

function App() {
  const items: BaseItem[] = [
    { id: 'A1', laneId: 'A', offset: 0 },
    { id: 'A2', laneId: 'A', offset: 60 },
    { id: 'B1', laneId: 'B', offset: 0 },
  ];
  const lanes: BaseLane[] = [{ id: 'A' }, { id: 'B' }];

  return (
    <SchedulerProvider items={items} lanes={lanes}>
      <Scheduler />
    </SchedulerProvider>
  );
}

export default App;
