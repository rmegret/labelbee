from typing import List, Optional
from labelbee.models import DataSet, User
from labelbee.app import db


def dataset_list() -> List[DataSet]:
    """Get list of all datasets.

    :return: A list of all datasets.
    :rtype: List[DataSet]
    """

    return DataSet.query.all()


def new_dataset(name: str, description: str, user: User):
    """Create a new dataset.

    :param name: The name of the dataset.
    :type name: str
    :param description: The description of the dataset.
    :type description: str
    :param user: The user creating the dataset.
    :type user: User
    """

    dataset = DataSet(
        name="New Dataset" if name.strip() == "" else name,
        description=description,
        created_by=user.id,
    )
    db.session.add(dataset)
    db.session.commit()
    return dataset

def get_dataset_by_id(datasetid: int) -> DataSet:
    """Get a dataset by id.

    :param datasetid: The id of the dataset to get.
    :type datasetid: int
    :return: The dataset specified by the id.
    :rtype: DataSet
    """

    return DataSet.query.filter(DataSet.id == datasetid).first()


def edit_dataset(datasetid: int, name: str, description: str) -> None:
    """Edit a dataset.

    :param datasetid: The id of the dataset to edit.
    :type datasetid: int
    :param name: The new name of the dataset.
    :type name: str
    :param description: The new description of the dataset.
    :type description: str
    """

    dataset = get_dataset_by_id(datasetid)
    if dataset:
        dataset.name = name
        dataset.description = description
        db.session.commit()


def delete_dataset_by_id(datasetid: int) -> None:
    """Delete a dataset by id.

    :param datasetid: The id of the dataset to delete.
    :type datasetid: int
    """

    dataset = get_dataset_by_id(datasetid)
    if dataset:
        db.session.delete(dataset)
        db.session.commit()
