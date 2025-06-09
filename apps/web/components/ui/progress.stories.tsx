import type { Meta, StoryObj } from '@storybook/react';
import { Progress } from './progress';

const meta: Meta<typeof Progress> = {
  title: 'UI/Progress',
  component: Progress,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
    className: {
      control: 'text',
    },
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 33,
  },
};

export const Empty: Story = {
  args: {
    value: 0,
  },
};

export const Half: Story = {
  args: {
    value: 50,
  },
};

export const Complete: Story = {
  args: {
    value: 100,
  },
};

export const TaskProgress: Story = {
  render: (args) => (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span>Task Progress</span>
          <span>{args.value}%</span>
        </div>
        <Progress {...args} />
      </div>
      <div className="text-xs text-gray-500">
        3 out of 9 subtasks completed
      </div>
    </div>
  ),
  args: {
    value: 33,
  },
};

export const PomodoroSession: Story = {
  render: (args) => (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span>Pomodoro Session</span>
          <span>12:30 remaining</span>
        </div>
        <Progress {...args} className="h-2" />
      </div>
      <div className="text-xs text-gray-500">
        Focus session in progress
      </div>
    </div>
  ),
  args: {
    value: 75,
  },
};