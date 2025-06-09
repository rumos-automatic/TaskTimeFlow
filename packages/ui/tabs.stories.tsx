import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

const meta: Meta<typeof Tabs> = {
  title: 'UI/Tabs',
  component: Tabs,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Tabs defaultValue="kanban" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="kanban">Kanban</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
      </TabsList>
      <TabsContent value="kanban" className="mt-4">
        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Kanban Board</h3>
          <p className="text-gray-600">
            Organize your tasks in columns by status. Drag and drop to change task states.
          </p>
        </div>
      </TabsContent>
      <TabsContent value="timeline" className="mt-4">
        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Timeline View</h3>
          <p className="text-gray-600">
            Schedule your tasks on a 24-hour timeline for optimal time management.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  ),
};

export const ThreeTabs: Story = {
  render: (args) => (
    <Tabs defaultValue="today" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="today">Today</TabsTrigger>
        <TabsTrigger value="week">This Week</TabsTrigger>
        <TabsTrigger value="month">This Month</TabsTrigger>
      </TabsList>
      <TabsContent value="today" className="mt-4">
        <div className="space-y-2">
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="font-medium">Complete project proposal</div>
            <div className="text-sm text-gray-600">Due: 2:00 PM</div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="font-medium">Team standup meeting</div>
            <div className="text-sm text-gray-600">Due: 10:00 AM</div>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="week" className="mt-4">
        <div className="p-4 text-center text-gray-500">
          Weekly view content
        </div>
      </TabsContent>
      <TabsContent value="month" className="mt-4">
        <div className="p-4 text-center text-gray-500">
          Monthly view content
        </div>
      </TabsContent>
    </Tabs>
  ),
};

export const VerticalTabs: Story = {
  render: (args) => (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid w-full grid-cols-1 h-auto">
        <TabsTrigger value="general" className="justify-start">
          General Settings
        </TabsTrigger>
        <TabsTrigger value="notifications" className="justify-start">
          Notifications
        </TabsTrigger>
        <TabsTrigger value="privacy" className="justify-start">
          Privacy & Security
        </TabsTrigger>
      </TabsList>
      <TabsContent value="general" className="mt-4">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Display Name</label>
            <input type="text" className="w-full mt-1 p-2 border rounded" placeholder="Your name" />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <input type="email" className="w-full mt-1 p-2 border rounded" placeholder="your@email.com" />
          </div>
        </div>
      </TabsContent>
      <TabsContent value="notifications" className="mt-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span>Email notifications</span>
            <input type="checkbox" />
          </div>
          <div className="flex items-center justify-between">
            <span>Push notifications</span>
            <input type="checkbox" />
          </div>
        </div>
      </TabsContent>
      <TabsContent value="privacy" className="mt-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span>Make profile public</span>
            <input type="checkbox" />
          </div>
          <div className="flex items-center justify-between">
            <span>Show activity status</span>
            <input type="checkbox" />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  ),
};