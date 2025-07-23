import React from 'react';
import { Todo } from '../types';
import { Check, X } from 'lucide-react';

interface TodoListProps {
    todos: Todo[];
    onToggle: (id: number) => void;
    onDelete: (id: number) => void;
    style?: React.CSSProperties;
}

const TodoList: React.FC<TodoListProps> = ({ todos, onToggle, onDelete, style }) => {
    console.log("TODO CARD:" + todos.toString())
    return (
        <div className="card-style p-6 h-full flex flex-col" style={style}>
            <h2 className="text-xl font-bold text-[--primary-text-color] mb-5 flex-shrink-0">To-Do List</h2>
            <div className="flex-grow space-y-4 overflow-y-auto -mr-2 pr-2">
                {todos.map(todo => (
                    <div
                        key={todo.id}
                        className="flex items-center group"
                    >
                        <div
                            onClick={() => onToggle(todo.id)}
                            className="flex items-center cursor-pointer flex-grow"
                        >
                            <div
                                className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mr-4 flex items-center justify-center transition-all duration-200 ${
                                    todo.done  /* заменено todo.done на todo.completed */
                                        ? 'bg-[--accent-color] border-[--accent-color]'
                                        : 'border-[--secondary-text-color] group-hover:border-[--primary-text-color]'
                                }`}
                            >
                                {todo.done && (  /* заменено todo.done на todo.completed */
                                   <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                                )}
                            </div>
                            <span className={`transition-colors duration-200 text-base font-medium ${
                                todo.done  /* заменено todo.done на todo.completed */
                                    ? 'line-through text-[--secondary-text-color]'
                                    : 'text-[--primary-text-color]'
                            }`}>{todo.content}</span>
                        </div>
                         <button onClick={() => onDelete(todo.id)} className="ml-4 text-[--secondary-text-color] hover:text-[--danger-color] opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-5 h-5"/>
                        </button>
                    </div>
                ))}
                 {todos.length === 0 && (
                    <div className="text-center text-[--secondary-text-color] pt-8">
                        <p>All done!</p>
                    </div>
                 )}
            </div>
        </div>
    );
};

export default TodoList;
